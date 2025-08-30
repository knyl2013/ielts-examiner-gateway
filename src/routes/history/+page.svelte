<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import HistoryChart from '$lib/components/HistoryChart.svelte';
    import { userStore, type ReportData } from '$lib/stores';
    import { db } from '$lib/firebase';
    import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
	import type { HistoryEntry } from '../../types/ChatHistory';
	import Login from '$lib/components/Login.svelte';

    let historyEntries: HistoryEntry[] = [];
    let error: string | null = null;
    let isLoading = true;

    $: averageScore =
        historyEntries.length > 0
            ? historyEntries.reduce((sum, entry) => sum + entry.overallScore, 0) /
                historyEntries.length
            : 0;

    $: totalMinutes =
        historyEntries.length > 0
            ? Math.round(
                    historyEntries.reduce((sum, entry) => sum + (entry.callDuration || 0), 0) / 60
                )
            : 0;

    const goBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            goto('/');
        }
    };

    onMount(() => {
        // We subscribe to the userStore to react to login/logout status
        const unsubscribe = userStore.subscribe(async (user) => {
            // user is `undefined` on initial load, so we wait.
            if (user === undefined) {
                return;
            }

            isLoading = true;

            try {
                if (user) {
                    const reportsRef = collection(db, 'reports');
                    // Create a query to get reports for this user, ordered by creation time
                    const q = query(
                        reportsRef,
                        where('userId', '==', user.uid),
                        orderBy('date', 'desc')
                    );
                    const querySnapshot = await getDocs(q);
                    const firebaseHistory: HistoryEntry[] = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        firebaseHistory.push({
                            id: doc.id,
                            date: (data.date as Timestamp).toDate(),
                            overallScore: data.overallScore,
                            callDuration: data.callDuration
                        });
                    });
                    historyEntries = firebaseHistory;
                } else {
                    const rawHistory = localStorage.getItem('reportHistory');
                    if (!rawHistory) {
                        historyEntries = [];
                        return;
                    }
                    const parsedHistory: ReportData[] = JSON.parse(rawHistory);
                    parsedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    // We map it to the new structure, using the date as a fallback ID
                    historyEntries = parsedHistory.map((report) => ({
                        id: report.date.toString(), // The ID for guests is still the date string
                        date: new Date(report.date),
                        overallScore: report.overallScore,
                        callDuration: report.callDuration
                    }));
                }
            } catch (e) {
                console.error('Failed to load report history:', e);
                error = 'Could not load your report history.';
            } finally {
                isLoading = false;
            }
        });

        // Clean up the subscription when the component is destroyed
        return () => unsubscribe();
    });

    const viewReportDetail = (reportId: string) => {
        goto(`/report/${encodeURIComponent(reportId)}`);
    };

    // Helper to format dates for display
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
</script>

<div class="reportContainer">
    <main class="mainContent">
        <header class="header">
            <button class="backButton" on:click={goBack} aria-label="Back">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="white" />
                </svg>
            </button>
            <div class="callerInfo">
                <h1>Report History</h1>
                <p>Your past performance and progress</p>
            </div>
            <Login />
        </header>
        {#if isLoading}
            <div class="statusContainer">
                <div class="spinner"></div>
                <p>Loading History...</p>
            </div>
        {:else if error}
            <div class="statusContainer">
                <h1 class="statusTitle error">Load Failed</h1>
                <p class="statusSubtitle">{error}</p>
            </div>
        {:else if historyEntries.length === 0}
            <div class="statusContainer">
                <h1 class="statusTitle">No History Found</h1>
                <p class="statusSubtitle">Complete a new call to start tracking your progress.</p>
            </div>
        {:else}
            <!-- Bonus: Score Progression Chart -->
            {#if historyEntries.length > 1}
            <section>
                <h2 class="sectionTitle">Score Progression</h2>
                <div class="statsContainer" class:no-chart={historyEntries.length <= 1}>
                    <div class="statItem">
                        <span class="statValue">{averageScore.toFixed(1)}</span>
                        <span class="statLabel">Avg. Score</span>
                    </div>
                    <div class="statItem">
                        <span class="statValue">{totalMinutes}</span>
                        <span class="statLabel">Total Practice (min)</span>
                    </div>
                </div>
                <div class="chartContainer">
                    <HistoryChart data={historyEntries} />
                </div>
            </section>
            {/if}

            <!-- Report List -->
            <section>
                <h2 class="sectionTitle">Past Reports</h2>
                <div class="reportList">
                    {#each historyEntries as report}
                        <button class="reportItem" on:click={() => viewReportDetail(report.id)}>
                            <div class="reportItemInfo">
                                <span class="reportDate">{formatDate(report.date)}</span>
                                <span class="reportAvgLabel">Avg. Score</span>
                            </div>
                            <div class="reportItemScore">{report.overallScore.toFixed(1)}</div>
                        </button>
                    {/each}
                </div>
            </section>
        {/if}
    </main>
</div>


<style>
    /* Base Container & Font */
    .reportContainer { width: 100vw; height: 100vh; height: 100dvh; overflow: hidden; position: relative; display: flex; flex-direction: column; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: radial-gradient(circle at 50% 50%, #5a4743, #3a2723); }
    /* Header */
    .header { padding: 40px 10px 10px; text-align: center; position: relative; flex-shrink: 0; }
    .backButton { position: absolute; left: 15px; top: 55px; background: none; border: none; color: white; cursor: pointer; padding: 5px; }
    .callerInfo h1 { margin: 0; font-size: 2.2rem; font-weight: 600; }
    .callerInfo p { margin: 5px 0 0; font-size: 1rem; color: #d1d1d6; font-weight: 400; }
    /* Main Content Area */
    .mainContent { flex-grow: 1; overflow-y: auto; padding: 10px 30px 30px 30px; }
    .mainContent::-webkit-scrollbar { display: none; }
    .mainContent { -ms-overflow-style: none; scrollbar-width: none; }
    /* Shared Section Title */
    .sectionTitle { font-size: 1.4rem; font-weight: 600; margin-top: 20px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.15); }
    /* Status/Loading States */
    .statusContainer { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; text-align: center; }
    .statusTitle { font-size: 2rem; font-weight: 600; margin-bottom: 10px; }
    .statusTitle.error { color: #ff3b30; }
    .statusSubtitle { font-size: 1rem; color: #d1d1d6; margin-bottom: 40px; }
    .spinner { width: 60px; height: 60px; border: 5px solid rgba(255, 255, 255, 0.2); border-top-color: #ffffff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 30px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .chartContainer {
        background: rgba(255, 255, 255, 0.05);
        padding: 20px;
        border-radius: 15px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .statsContainer {
        display: flex;
        justify-content: space-around;
        padding: 20px;
        margin-bottom: 20px;
        margin-top: 15px; /* Space between chart and stats */
        background: rgba(255, 255, 255, 0.05);
        border-radius: 15px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .statsContainer.no-chart {
        margin-top: 0; /* Remove top margin if the chart isn't displayed */
    }

    .statItem {
        text-align: center;
    }

    .statValue {
        font-size: 2rem;
        font-weight: 700;
        display: block;
    }

    .statLabel {
        font-size: 0.8rem;
        color: #c7c7cc;
    }
    
    .reportList {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .reportItem {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 20px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 15px;
        color: white;
        text-align: left;
        cursor: pointer;
        transition: transform 0.2s ease, background-color 0.2s ease;
    }
    
    .reportItem:hover {
        transform: translateY(-3px);
        background: rgba(255, 255, 255, 0.08);
    }
    
    .reportItemInfo {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    .reportDate {
        font-size: 1rem;
        font-weight: 500;
    }
    
    .reportAvgLabel {
        font-size: 0.8rem;
        color: #c7c7cc;
    }
    
    .reportItemScore {
        font-size: 2.5rem;
        font-weight: 700;
    }
</style>