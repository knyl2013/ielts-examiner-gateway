import OpusRecorder from 'opus-recorder';
import { writable, type Writable } from 'svelte/store';

// This is a direct Svelte conversion of the provided React hook.

// The helper function remains the same.
const getAudioWorkletNode = async (
    audioContext: AudioContext,
    name: string
) => {
    try {
        return new AudioWorkletNode(audioContext, name);
    } catch {
        await audioContext.audioWorklet.addModule(`/${name}.js`);
        return new AudioWorkletNode(audioContext, name, {});
    }
};

export interface AudioProcessor {
    audioContext: AudioContext;
    opusRecorder: OpusRecorder;
    decoder: Worker;
    outputWorklet: AudioWorkletNode;
    inputAnalyser: AnalyserNode;
    outputAnalyser: AnalyserNode;
    mediaStreamDestination: MediaStreamAudioDestinationNode;
    gainNode: GainNode;
    setVolume: (level: number) => void;
}

/**
* Creates and manages the audio processing pipeline.
* This is the Svelte-native replacement for the useAudioProcessor React hook.
*/
export function useAudioProcessor(onOpusRecorded: (chunk: Uint8Array) => void) {
    let audioProcessor: AudioProcessor | null = null;
    const processorStore = writable<AudioProcessor | null>(null);

    const setupAudio = async (mediaStream: MediaStream): Promise<AudioProcessor | undefined> => {
        if (audioProcessor) return audioProcessor;

        const audioContext = new AudioContext();
        const outputWorklet = await getAudioWorkletNode(audioContext, "audio-output-processor");
        const source = audioContext.createMediaStreamSource(mediaStream);
        const inputAnalyser = audioContext.createAnalyser();
        inputAnalyser.fftSize = 2048;
        source.connect(inputAnalyser);

        const mediaStreamDestination = audioContext.createMediaStreamDestination();
        outputWorklet.connect(mediaStreamDestination);
        source.connect(mediaStreamDestination);

        const outputAnalyser = audioContext.createAnalyser();
        outputAnalyser.fftSize = 2048;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.0; 

        outputWorklet.connect(outputAnalyser);
        outputAnalyser.connect(gainNode);
        gainNode.connect(audioContext.destination);

        const decoder = new Worker("/decoderWorker.min.js") as Worker;
        let micDuration = 0;

        decoder.onmessage = (event: MessageEvent<any>) => {
            if (!event.data) return;
            const frame = event.data[0];
            outputWorklet.port.postMessage({
                frame: frame,
                type: "audio",
                micDuration: micDuration,
            });
        };
        decoder.postMessage({
            command: "init",
            bufferLength: (960 * audioContext.sampleRate) / 24000,
            decoderSampleRate: 24000,
            outputBufferSampleRate: audioContext.sampleRate,
            resampleQuality: 0,
        });

        const recorderOptions = {
            encoderPath: "/encoderWorker.min.js",
            encoderSampleRate: 24000,
            numberOfChannels: 1,
            encoderApplication: 2049,
            encoderFrameSize: 20,
            resampleQuality: 10,
            streamPages: true,
        };
        const opusRecorder = new OpusRecorder(recorderOptions);
        opusRecorder.ondataavailable = (data: Blob) => {
            micDuration = opusRecorder.encodedSamplePosition / 48000;
            onOpusRecorded(data);
        };
        await opusRecorder.initialize;
        opusRecorder.audioContext.createMediaStreamSource(mediaStream).connect(opusRecorder.encoderNode);

        const setVolume = (level: number) => {
            if (gainNode) {
                gainNode.gain.setTargetAtTime(level, audioContext.currentTime, 0.01);
            }
        };

        audioProcessor = {
            audioContext: opusRecorder.audioContext,
            opusRecorder,
            decoder,
            outputWorklet,
            inputAnalyser,
            outputAnalyser,
            mediaStreamDestination,
            gainNode,
            setVolume,
        };
        processorStore.set(audioProcessor);

        await audioProcessor.audioContext.resume();
        opusRecorder.start();

        return audioProcessor;
    };

    const shutdownAudio = () => {
        if (audioProcessor) {
            const { audioContext, opusRecorder } = audioProcessor;
            audioContext.close();
            opusRecorder.stop();

            audioProcessor = null;
            processorStore.set(null);
        }
    };

    return {
        setupAudio,
        shutdownAudio,
        processorStore
    };
}