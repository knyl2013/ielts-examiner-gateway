<script lang="ts">
	import { onMount } from 'svelte';
	import FaPhoneSlash from 'svelte-icons/fa/FaPhoneSlash.svelte';
	import FaPhone from 'svelte-icons/fa/FaPhone.svelte';
	import FaCheckCircle from 'svelte-icons/fa/FaCheckCircle.svelte';

	import { DEFAULT_UNMUTE_CONFIG, instructionsToPlaceholder, type Instructions, type UnmuteConfig } from '$lib/config';

	import { useMicrophoneAccess } from '$lib/useMicrophoneAccess';
	import { useAudioProcessor, type AudioProcessor } from '$lib/useAudioProcessor';
	import { base64DecodeOpus, base64EncodeOpus } from '$lib/audioUtil';
	import type { ChatMessage } from '$lib/chatHistory';

	import { generateReport, now, userSettingsStore, userStore, type ReportData, userProfileStore } from '$lib/stores';
	import { goto } from '$app/navigation';
	import Login from './Login.svelte';
	import { get } from 'svelte/store';
	import { collection, getCountFromServer, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
	import { db } from '$lib/firebase';

	import { format } from 'timeago.js';
	import { PUBLIC_GUEST_DAILY_LIMIT, PUBLIC_SIGNED_USER_DAILY_LIMIT } from '$env/static/public';

	export let name: string = 'IELTS Examiner';
	export let description: string = 'Estimate your IELTS speaking score by chatting to AI';
	export let imageUrl: string = '/ielts-examiner.png';

	let reportsToday: number = 0;
    let dailyLimit: number = Infinity; // Default to infinity, will be updated
    let isLoadingUsage: boolean = true; // For potential UI feedback

    const checkUsage = async () => {
        isLoadingUsage = true;
        const currentUser = get(userStore);
        const profile = get(userProfileStore);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        if (currentUser && profile) {
            // --- Logic for Signed-in User ---
			dailyLimit = profile.plan === 'plus' ? Infinity : PUBLIC_SIGNED_USER_DAILY_LIMIT;

            try {
                const reportsRef = collection(db, 'reports');
                // Query for reports by this user, created on or after the start of today
                const q = query(
                    reportsRef,
                    where('userId', '==', currentUser.uid),
                    where('date', '>=', startOfDay)
                );
                // Use getCountFromServer for efficiency
                const snapshot = await getCountFromServer(q);
                reportsToday = snapshot.data().count;
            } catch (error) {
                console.error('Error fetching report count from Firestore:', error);
                // Fail safe: assume 0 if there's an error
                reportsToday = 0;
            }
        } else {
            // --- Logic for Guest User ---
            dailyLimit = PUBLIC_GUEST_DAILY_LIMIT;
            try {
                const localHistory: ReportData[] = JSON.parse(
                    localStorage.getItem('reportHistory') || '[]'
                );
                reportsToday = localHistory.filter(report => new Date(report.date) >= startOfDay).length;
            } catch (error) {
                console.error('Error parsing report history from localStorage:', error);
                reportsToday = 0;
            }
        }
        isLoadingUsage = false;
        console.log(`Usage Check: ${reportsToday} reports used today. Limit is ${dailyLimit}.`);
    };

	$: if ($userStore !== undefined) {
        checkUsage();
    }

	let isOngoing: boolean = false;
	let callDuration: number = 0;

	let unmuteConfig: UnmuteConfig = DEFAULT_UNMUTE_CONFIG;
	let callStartTime: Date | null = null;
	let shouldConnect = false; // This is our main trigger for the connection
	let ws: WebSocket | null = null;
	let readyState: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'FAILED' = 'CLOSED';
	let conversationState: 'bot_speaking' | 'user_speaking' | 'waiting_for_user' = 'waiting_for_user';
	let isReady = false;
	let setupAudio: (mediaStream: MediaStream) => Promise<AudioProcessor | undefined>;
	let shutdownAudio: () => void;
	let processorStore: Writable<AudioProcessor | null>;
	let audioProcessorMain: AudioProcessor | undefined;
	let webSocketUrl: string | null = null;
	let connectingAudio: HTMLAudioElement;
	let podId: string | null = null;
	let chatHistory: ChatMessage[] = [];
	let status: 'online' | 'offline' = 'offline';

	const checkHealth = async () => {
		try {
			const response = await fetch('/api/healthcheck', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ podId: podId })
			});
			const json = await response.json();
			if (response.ok) {
				status = json.status;
			} else {
				status = 'offline';
			}
		} catch (error) {
			console.error('Health check request failed:', error);
			status = 'offline';
		}
	};

	async function notifyBackend(action: 'register' | 'unregister') {
		try {
			// The 'keepalive' flag is CRITICAL for 'unregister'. It ensures the
			// request is sent even if the page is being closed.
			await fetch('/api/pod-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action }),
				keepalive: action === 'unregister'
			}).then(async (res) => {
				const result = await res.json();
				if (result.webSocketUrl) {
					webSocketUrl = result.webSocketUrl;
				}
				if (result.podId) {
					podId = result.podId;
				}
			});
		} catch (e) {
			console.error(`Failed to ${action} connection:`, e);
		}
	}

	onMount(() => {
		const audioProcessor = useAudioProcessor(onOpusRecorded);

		setupAudio = audioProcessor.setupAudio;
		shutdownAudio = audioProcessor.shutdownAudio;
		processorStore = audioProcessor.processorStore;

		isReady = true;

		checkHealth();
		const intervalId = setInterval(checkHealth, 2000);
		
		notifyBackend('register');

		return () => {
			if (shutdownAudio) shutdownAudio();
			if (intervalId) clearInterval(intervalId);
			notifyBackend('unregister');
		};
	});

	const { askMicrophoneAccess, microphoneAccessStatus } = useMicrophoneAccess();

	const formatTime = (totalSeconds: number) => {
		const minutes = Math.floor(totalSeconds / 60)
			.toString()
			.padStart(2, '0');
		const seconds = (totalSeconds % 60).toString().padStart(2, '0');
		return `${minutes}:${seconds}`;
	};

	function onOpusRecorded(opus: Uint8Array) {
		console.log(
			`[PhoneCallScreen] onOpusRecorded called. readyState: ${readyState}, opus size: ${opus.length}`
		);
		console.log(ws);
		if (ws && readyState === 'OPEN') {
			ws.send(
				JSON.stringify({
					type: 'input_audio_buffer.append',
					audio: base64EncodeOpus(opus)
				})
			);
		}
	}

	const handleStartCall = async () => {
		if (status !== 'online') {
			alert(
				'Bringing up the server. This could take 3-4 minutes.'
			);
			console.warn('Server is not ready yet.');
			return;
		}
		if (!isReady || !setupAudio) {
			console.warn('Audio processor is not ready yet.');
			return;
		}
		// 1. Ask for microphone permission
		const mediaStream = await askMicrophoneAccess();

		// 2. If we get permission, set up audio processing
		if (mediaStream) {
			requestWakeLock();
			readyState = 'CONNECTING';
			if ((navigator as any).audioSession) {
				(navigator as any).audioSession.type = 'playback';
			}
			audioProcessorMain = await setupAudio(mediaStream);
			isOngoing = true;
			callDuration = 0;
			// 3. Set our trigger to true. The reactive block below will handle the connection.
			shouldConnect = true;
			callStartTime = new Date();
		} else {
			// Handle the case where the user denies permission
			console.error('Microphone access was denied.');
			alert('You must allow microphone access to start the call.');
		}
	};

	const handleStopCall = async () => {
		if (!isReportReady) {
			if (!confirm("The report is not ready yet. Are you sure you want to stop the call?")) {
				return;
			}
		}
		isOngoing = false;
		shouldConnect = false;
		shutdownAudio();
		callStartTime = null;
		readyState = 'CLOSED';

		// Navigate to the special 'latest' route immediately.
		// The report page will show the 'generating' state from the store.
		goto('/report/latest');

		// Now, start the report generation in the background. The page is already
		// listening for the result via the reportStore.
		await generateReport(chatHistory, isReportReady, callDuration);
	};

	const requestWakeLock = async () => {
		try {
			const wakeLock = await navigator.wakeLock.request('screen');
		} catch (err: any) {
			// The wake lock request fails - usually system-related, such as low battery.
			console.log(`${err.name}, ${err.message}`);
		}
	};

	$: callDuration = callStartTime
		? Math.round(($now.getTime() - callStartTime.getTime()) / 1000)
		: 0;

	$: isReportReady = callDuration >= 60;

	$: reportTooltip = isReportReady
		? 'Ready to generate a report'
		: 'Report not ready yet. Try to chat a bit more.';

	$: {
		if (connectingAudio) {
			// Wait for the audio element to be bound
			if (readyState === 'CONNECTING') {
				// Play the sound. The .catch is good practice for browser audio policies.
				connectingAudio.play().catch((e) => console.error('Audio play failed', e));
			} else {
				// If the state is anything else, stop the sound and reset it.
				connectingAudio.pause();
				connectingAudio.currentTime = 0;
			}
		}
	}

	$: {
		if (shouldConnect && !ws && webSocketUrl != null) {
			console.log('Connecting to WebSocket...');
			readyState = 'CONNECTING';
			const newWs = new WebSocket(webSocketUrl, ['realtime']);

			newWs.onopen = async () => {
				console.log('WebSocket connected!');
				readyState = 'OPEN';
				let finalInstructions: Instructions = unmuteConfig.instructions;
				const currentUser = get(userStore);
				const settings = get(userSettingsStore);
				let summaries: string[] = [];

				if (currentUser && settings.memory) {
					console.log('Memory feature enabled. Fetching recent conversation summaries...');
					try {
						const reportsRef = collection(db, 'reports');
						const q = query(
							reportsRef,
							where('userId', '==', currentUser.uid),
							orderBy('date', 'desc'),
							limit(5)
						);
						const querySnapshot = await getDocs(q);
						summaries = querySnapshot.docs.map(
							(doc) => {
								const data = doc.data() as ReportData;
								return format((data.date as any).toDate()) + ": " + data.conversationSummary;
							}
						);
					} catch (error) {
						console.error("Failed to fetch conversation history for memory:", error);
						// If fetching fails, we'll just proceed without memory.
					}
				} else if (!currentUser) {
					console.log('Memory feature enabled by default for guests. Fetching recent conversation summaries...');
					const reportHistory = JSON.parse(localStorage.getItem('reportHistory') || '[]') as ReportData[];
					summaries = reportHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(
						(data) => {
							return format(data.date) + ": " + data.conversationSummary;
						}
					);
				}
				if (summaries.length > 0) {
					const memoryPrefix = `For context, here are summaries of our last ${summaries.length} conversations:\n\n${summaries.map((s, i) => `${s}`).join('\n')}\n\nPlease keep these in mind for continuity. Now, let's begin today's conversation. If possible mention one of the last conversation when you greet the user initially.`;
					
					const originalInstructionsText = instructionsToPlaceholder(unmuteConfig.instructions);
					
					const fullText = `${memoryPrefix}\n\n${originalInstructionsText}`;

					finalInstructions = { type: 'constant', text: fullText };
					console.log('Added conversation memory to instructions.');
				} else {
					// This is a first-time user with no conversation history.
					const welcomePrefix = `This is the user's first conversation. Please provide a warm and encouraging welcome. Let them know you're an AI partner here to help them practice English, and an IELTS score estimation will be generated after the conversation and they can stop whenever they want.`;
					const originalInstructionsText = instructionsToPlaceholder(unmuteConfig.instructions);
					const fullText = `${welcomePrefix}\n\n${originalInstructionsText}`;

					finalInstructions = { type: 'constant', text: fullText };
					console.log('This is a first-time user. Added welcoming instructions.');
				}
				const sessionPayload = {
					instructions: finalInstructions,
					// voice: 'unmute-prod-website/ex04_narration_longform_00001.wav', // Female voice
					voice: 'unmute-prod-website/developer-1.mp3', // Male voice
					allow_recording: true
				};
				console.log('WebSocket connected! Sending config:', sessionPayload);
				newWs.send(
					JSON.stringify({
						type: 'session.update',
						session: sessionPayload
					})
				);
			};

			newWs.onmessage = (event) => {
				const message = JSON.parse(event.data);
				if (message.type === 'response.audio.delta') {
					if (message.delta) {
						const opus = base64DecodeOpus(message.delta);
						const ap = audioProcessorMain;
						if (!ap) return;
						ap.decoder.postMessage(
							{
								command: 'decode',
								pages: opus
							},
							[opus.buffer]
						);
					} else {
						console.log('Received response.audio.delta but message.delta is undefined or null');
					}
				} else if (message.type === 'unmute.additional_outputs') {
					console.log('Received metadata message:', message);
					conversationState = message.args.debug_dict.conversation_state;
					chatHistory = message.args.chat_history;
				} else {
					console.log('Received unknown message:', message);
				}
			};

			newWs.onclose = () => {
				console.log('WebSocket disconnected.');
				ws = null;
				// If the connection closes unexpectedly, update the UI state
				if (isOngoing) {
					handleStopCall();
				}
			};

			newWs.onerror = (error) => {
				console.error('WebSocket error:', error);
				readyState = 'FAILED'; // Indicate failure to connect
				ws = null;
				if (isOngoing) {
					handleStopCall();
				}
			};

			ws = newWs;
		} else if (!shouldConnect && ws) {
			console.log('Disconnecting WebSocket...');
			ws.close();
			ws = null;
			readyState = 'CLOSED';
		}
	}

	$: {
		if (reportsToday >= dailyLimit) {
            alert(
                `You have reached your daily limit of ${dailyLimit} ${
                    dailyLimit === 1 ? 'report' : 'reports'
                }. Please upgrade your plan or try again tomorrow.`
            );
            goto('/pricing');
        }
	}
</script>

<div class="callContainer">
	<header class="header">
		<div class="callerInfo">
			<h1 class="name-container"><span class={`server-indicator ${status}`}></span> {name}</h1>
			<h5 class="description-container">{description}</h5>
			<p
				style:opacity={readyState === 'CONNECTING' ||
				readyState === 'OPEN' ||
				readyState === 'FAILED'
					? '1'
					: '0'}
			>
				{readyState === 'CONNECTING'
					? 'Connecting...'
					: readyState === 'OPEN'
						? `${formatTime(callDuration)}`
						: readyState === 'FAILED'
							? 'Connection failed. Please try again.'
							: 'PLACEHOLDER'}
			</p>
		</div>
		<div>
			<button class="historyButton"
				class:hide={isOngoing}
				on:click={() => goto('/history')} aria-label="View History"
			>
				<svg
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L9 12H6C6 8.13 9.13 5 13 5C16.87 5 20 8.13 20 12C20 15.87 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12C22 7.03 17.97 3 13 3ZM12 8V13L16.28 15.54L17 14.33L13.5 12.25V8H12Z"
						fill="white"
					/>
				</svg>
			</button>
			<Login />
		</div>
	</header>

	<main class="mainContent">
		<div class="profileImageContainer">
			<img src={imageUrl} alt={name} class="profileImage" />
		</div>
		<div
			class="profileImageContainerSpinner"
			class:shouldShow={conversationState === 'user_speaking'}
		></div>
		<div
			class="profileImageContainerSpeakingBorder"
			class:shouldShow={conversationState === 'bot_speaking'}
		></div>
	</main>

	<footer class="footerControls">
		{#if !isOngoing && readyState !== 'CONNECTING'}
			<button class={`controlButton startCallButton ${status}`} on:click={handleStartCall}>
				{#if status === 'online'}
					<FaPhone />
				{:else}
					<div class="spinner"></div>
				{/if}
			</button>
			{#if status !== 'online'}
				<h5>
					Bringing up the server (This could take 3-4 mins)
				</h5>
			{/if}
			<div class="loadingBarContainer" class:finished={status === 'online'}>
				<div class="loadingBar"></div>
			</div>
		{:else}
			<button class="controlButton endCallButton" on:click={handleStopCall}>
				<FaPhoneSlash />
			</button>
			<div
				class="reportIndicator"
				class:ready={isReportReady}
				class:not-ready={!isReportReady}
				title={reportTooltip}
				aria-label={reportTooltip}
				role="img"
			>
				<FaCheckCircle />
				<div class="reportTooltip">{reportTooltip}</div>
			</div>
		{/if}

		{#if $microphoneAccessStatus === 'denied'}
			<p class="error-text">Microphone access denied. Please enable it in your browser settings.</p>
		{/if}
	</footer>
	<audio src="/connecting.wav" bind:this={connectingAudio} loop></audio>
</div>

<style>
	.error-text {
		color: red;
		position: absolute;
		bottom: 20px;
		width: 100%;
		text-align: center;
	}

	.callContainer {
		position: fixed;
		width: 100%;
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		color: white;
		overflow: hidden; /* Ensure no scrollbars appear */
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		background: radial-gradient(circle at 50% 50%, #5a4743, #3a2723);
	}

	.header {
		padding: 50px 20px 20px;
		text-align: center;
		position: relative;
	}

	.backButton {
		position: absolute;
		left: 15px;
		top: 55px;
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		padding: 5px;
	}

	.callerInfo h1 {
		margin: 0;
		font-size: 2.2rem;
		font-weight: 600;
	}

	.callerInfo p {
		margin: 5px 0 0;
		font-size: 1rem;
		color: #d1d1d6;
		font-weight: 500;
	}

	.mainContent {
		flex-grow: 1;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.profileImageContainer {
		width: 150px;
		height: 150px;
		border-radius: 50%;
		overflow: hidden;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
	}

	.profileImage {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.footerControls {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0 20px 50px 20px;
    gap: 12px;
	}

	.controlButton {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background-color: rgba(255, 255, 255, 0.2);
		border: none;
		color: white;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.controlButton:active {
		background-color: rgba(255, 255, 255, 0.4);
	}

	.controlButton:hover {
		background-color: rgba(255, 255, 255, 0.3);
	}

	.endCallButton {
		background-color: #ff3b30;
	}

	.endCallButton:active {
		background-color: #d93229;
	}

	.endCallButton:hover {
		background-color: #ff5c5c;
	}

	.startCallButton {
		background-color: #34c759;
	}

	.startCallButton.offline {
		background-color: #5a4743;
	}

	.startCallButton:active {
		background-color: #28a745;
	}

	.startCallButton:hover {
		background-color: #45d160;
	}

	.server-indicator.online {
		background-color: #4caf50;
	}

	.server-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1px solid white;
		margin-top: 2vh;
		margin-right: 12px;
	}

	.name-container {
		display: flex;
		padding-left: calc(50% - 145px);
	}

	.description-container {
		font-style: italic;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 3px solid rgba(255, 255, 255, 0.3);
		border-top-color: #fff; /* This creates the "pac-man" effect */
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.break {
		flex-basis: 100%;
		width: 0;
	}

	.profileImageContainerSpinner.shouldShow {
		display: block;
	}
	.profileImageContainerSpinner {
		display: none;
		position: fixed;
		width: 170px;
		height: 170px;
		border-radius: 50%;
		border-radius: 50%;
		border: 3px dashed #34c759;
		animation: spin 5s linear infinite;
	}

	.profileImageContainerSpeakingBorder.shouldShow {
		display: block;
	}
	.profileImageContainerSpeakingBorder {
		display: none;
		position: fixed;
		width: 170px;
		height: 170px;
		border-radius: 50%;
		border-radius: 50%;
		border: 1px solid lightgrey;
		animation: pulse 1s infinite;
	}

	.historyButton {
		position: absolute;
		right: 105px;
		top: 13px;
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		padding: 5px;
		opacity: 0.8;
		transition: opacity 0.2s ease;
	}

	.historyButton.hide {
		display: none;
	}

	.reportIndicator {
		height: 20px;
   		width: 20px;
	}

	.reportIndicator .reportTooltip {
		position: absolute;
		bottom: 140%;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.85);
		color: #fff;
		padding: 6px 8px;
		border-radius: 6px;
		font-size: 12px;
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
	}

	.reportIndicator .reportTooltip::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border-width: 6px;
		border-style: solid;
		border-color: rgba(0, 0, 0, 0.85) transparent transparent transparent;
	}

	.reportIndicator.ready {
		color: #34c759;
	}

	.reportIndicator.not-ready {
		opacity: 0.5;
	}

	.reportIndicator:hover .reportTooltip {
		opacity: 1;
		transform: translateX(-50%) translateY(-2px);
	}

	.loadingBarContainer {
        width: 250px;
        height: 6px;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        overflow: hidden;
        position: absolute;
		bottom: 30px;
    }

	.loadingBar {
        width: 0%; /* Start at 0 width */
        height: 100%;
        background-color: #34c759; /* Green color to match the 'ready' button */
        border-radius: 3px;
        animation: fill-progress 50s linear forwards;
    }

	.loadingBarContainer.finished .loadingBar {
        width: 100%;
		animation: none;
    }

	.loadingBarContainer.finished {
        animation: fade-out 1s ease-out forwards;
	}

	@keyframes fade-out {
		0% {
			opacity: 1;
		}
		80% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}

    @keyframes fill-progress {
        from {
            width: 0%;
        }
        to {
            width: 90%;
        }
    }

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes pulse {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.1);
			opacity: 0;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
