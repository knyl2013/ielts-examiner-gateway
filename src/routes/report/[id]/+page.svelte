<script lang="ts">
  import { reportStore, userStore, type ReportData } from '$lib/stores';
  import { page } from '$app/stores'; // Import page store to get URL params
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
	import { doc, getDoc, Timestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import Login from '$lib/components/Login.svelte';

  // Define types for clarity
  type ReportState = {
      status: 'loading' | 'generating' | 'success' | 'error' | 'idle'; // Added 'loading'
      data?: ReportData;
      error?: string;
  };
  
  let currentReportState: ReportState = { status: 'loading' };
  
  // Get the report ID (date) from the URL
  const reportId = $page.params.id;

  const goBack = () => {
    goto('/');
  };

  onMount(() => {
      if (reportId === 'latest') {
          // This logic is for newly generated reports and remains the same
          const unsubscribe = reportStore.subscribe((value) => {
              currentReportState = {
                  status: value.status,
                  data: value.data ?? undefined,
                  error: value.error ?? undefined
              };
          });
          return unsubscribe;
      } else {
          // This logic is for fetching a specific historical report
          const unsubscribe = userStore.subscribe(async (user) => {
              if (user === undefined) {
                  currentReportState = { status: 'loading' };
                  return;
              }

              try {
                  if (user && reportId) {
                      const docRef = doc(db, 'reports', reportId);
                      const docSnap = await getDoc(docRef);

                      if (docSnap.exists()) {
                          // Security check: Make sure this user owns this report
                          if (docSnap.data().userId !== user.uid) {
                              throw new Error('You do not have permission to view this report.');
                          }
                          // Firestore timestamps need to be converted to Date objects
                          const data = docSnap.data();
                          const reportWithDateObjects: ReportData = {
                              ...data,
                              date: (data.date as Timestamp).toDate()
                          } as ReportData;

                          currentReportState = { status: 'success', data: reportWithDateObjects };
                      } else {
                          currentReportState = { status: 'error', error: 'Report not found.' };
                      }
                  } else {
                      const rawHistory = localStorage.getItem('reportHistory');
                      if (!rawHistory) throw new Error('No report history found.');
                      
                      const history: ReportData[] = JSON.parse(rawHistory);
                      const decodedId = decodeURIComponent(reportId || "");
                      const foundReport = history.find(r => r.date.toString() === decodedId);
                      
                      if (foundReport) {
                          currentReportState = { status: 'success', data: foundReport };
                      } else {
                          currentReportState = { status: 'error', error: 'Report not found in your local history.' };
                      }
                  }
              } catch (e: any) {
                  console.error('Failed to load report:', e);
                  currentReportState = { status: 'error', error: e.message || 'Failed to load report.' };
              }
          });
          return unsubscribe;
      }
  });

  const formatCriterionName = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  };
</script>

<div class="reportContainer">
  {#if (!currentReportState || currentReportState.status === 'generating')}
    <div class="statusContainer">
      <div class="spinner"></div>
      <h1 class="statusTitle">Generating Report</h1>
      <p class="statusSubtitle">Analyzing your conversation, please wait...</p>
    </div>
  {:else if currentReportState.status === 'error'}
    <div class="statusContainer">
      <h1 class="statusTitle error">Report Failed</h1>
      <p class="statusSubtitle">{currentReportState.error || 'An unknown error occurred.'}</p>
      <div class="footerControls">
        <a href="/" class="actionButton start">Try Again</a>
      </div>
    </div>
  {:else if currentReportState.status === 'success' && currentReportState.data}
    {@const report = currentReportState.data}
    <header class="header">
      <button class="backButton" on:click={goBack} aria-label="Back">
        <!-- ... Back SVG ... -->
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="white"/>
        </svg>
      </button>
      <div class="callerInfo">
        <p>Result</p>
      </div>
      <button class="historyButton" on:click={() => goto('/history')} aria-label="View History">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 3C8.03 3 4 7.03 4 12H1L4.89 15.89L9 12H6C6 8.13 9.13 5 13 5C16.87 5 20 8.13 20 12C20 15.87 16.87 19 13 19C11.07 19 9.32 18.21 8.06 16.94L6.64 18.36C8.27 19.99 10.51 21 13 21C17.97 21 22 16.97 22 12C22 7.03 17.97 3 13 3ZM12 8V13L16.28 15.54L17 14.33L13.5 12.25V8H12Z" fill="white"/>
        </svg>
      </button>
      <Login />
    </header>
  
   <main class="mainContent">
      <!-- Overall Score Section -->
      <section class="overallScoreSection">
        <div class="scoreCircle">
          {report.overallScore.toFixed(1)}
        </div>
        <p class="overallFeedback">{report.feedback}</p>
      </section>

      <!-- Detailed Scores Section -->
      <section>
        <h2 class="sectionTitle">Detailed Breakdown</h2>
        <div class="detailedScores">
          {#each Object.entries(report.scores) as [key, value]}
            <div class="scoreCard">
              <div class="scoreCardHeader">
                <h3 class="criterionName">{formatCriterionName(key)}</h3>
                <span class="criterionScore">{value.score.toFixed(1)}</span>
              </div>
              <p class="criterionFeedback">{value.feedback}</p>
            </div>
          {/each}
        </div>
      </section>

      <!-- Suggestions Section -->
      <section class="suggestionsSection">
        <h2 class="sectionTitle">Actionable Suggestions</h2>
        <ul class="suggestionsList">
          {#each report.suggestionsForImprovement as suggestion}
            <li class="suggestionItem">
              <span class="checkmark">✓</span>
              {suggestion}
            </li>
          {/each}
        </ul>
        {#if report.specificSuggestions && report.specificSuggestions.length > 0}
          <h2 class="sectionTitle">Specific Suggestions</h2>
          <div class="specificSuggestionsContainer">
            {#each report.specificSuggestions as item}
              <div class="specificSuggestionCard">
                <div class="suggestionHeader">
                  <div class="textBlock">
                    <span class="label">What you said:</span>
                    <p class="originalText">"{item.original}"</p>
                  </div>
                  <div class="arrow">→</div>
                  <div class="textBlock">
                    <span class="label">Could be better:</span>
                    <p class="suggestionText">"{item.suggestion}"</p>
                  </div>
                </div>
                <div class="explanation">
                  <span class="lightbulb">💡</span>
                  {item.explanation}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    </main>
  {/if}
</div>

<style>
 .reportContainer {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: radial-gradient(circle at 50% 50%, #5a4743, #3a2723);
  }

  /* Header (copied and adapted) */
  .header {
    padding: 20px 20px 20px;
    text-align: center;
    position: relative;
    flex-shrink: 0; /* Prevents header from shrinking */
  }

  .backButton {
    position: absolute;
    left: 15px;
    top: 20px;
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
    font-weight: 400;
  }

  /* Main Content Area */
  .mainContent {
    flex-grow: 1;
    overflow-y: auto; /* Crucial for long reports */
    padding: 10px 30px 30px 30px;
  }
  /* Hide scrollbar for a cleaner look */
  .mainContent::-webkit-scrollbar {
    display: none;
  }
  .mainContent {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Overall Score Styling */
  .overallScoreSection {
    text-align: center;
    margin-bottom: 30px;
  }

  .scoreCircle {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 10px auto 20px;
    font-size: 3.5rem;
    font-weight: 700;
    background: rgba(0,0,0,0.15);
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
  }

  .overallFeedback {
    font-size: 1rem;
    color: #e0e0e0;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.5;
  }

  /* Shared Section Title */
  .sectionTitle {
    font-size: 1.4rem;
    font-weight: 600;
    margin-top: 20px;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  }

  /* Detailed Scores Grid */
  .detailedScores {
    display: grid;
    grid-template-columns: 1fr; /* Default to single column */
    gap: 15px;
  }
  /* On wider screens, go to 2 columns */
  @media (min-width: 768px) {
    .detailedScores {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  .scoreCard {
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: transform 0.2s ease, background-color 0.2s ease;
  }
  .scoreCard:hover {
    transform: translateY(-3px);
    background: rgba(255, 255, 255, 0.08);
  }

  .scoreCardHeader {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
  }

  .criterionName {
    font-size: 1.1rem;
    font-weight: 500;
    color: #ffffff;
  }

  .criterionScore {
    font-size: 1.8rem;
    font-weight: bold;
    color: #ffffff;
  }

  .criterionFeedback {
    font-size: 0.95rem;
    color: #c7c7cc;
    line-height: 1.6;
  }

  /* Suggestions List */
  .suggestionsSection {
    padding-bottom: 40px; /* Extra padding at the very end */
  }

  .suggestionsList {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .suggestionItem {
    background: rgba(46, 204, 113, 0.1);
    border-left: 3px solid #34c759;
    padding: 15px;
    border-radius: 8px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 0.95rem;
    color: #e0e0e0;
  }
  .checkmark {
    color: #34c759;
    font-weight: bold;
    font-size: 1.1rem;
    line-height: 1.5;
  }

  /* Footer Controls */
  .footerControls {
    padding: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  .actionButton {
    display: inline-block;
    padding: 15px 40px;
    border-radius: 30px;
    border: none;
    color: white;
    font-size: 1.1rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
  }
  .actionButton:active {
    transform: scale(0.98);
  }
  .actionButton.start {
    background-color: #34c759;
  }
  .actionButton.start:hover {
    background-color: #45d160;
  }

  /* Loading and Error States */
  .statusContainer {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 20px;
    text-align: center;
  }
  .statusTitle {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 10px;
  }
  .statusTitle.error {
    color: #ff3b30;
  }
  .statusSubtitle {
    font-size: 1rem;
    color: #d1d1d6;
    margin-bottom: 40px;
  }

  .spinner {
    width: 60px;
    height: 60px;
    border: 5px solid rgba(255, 255, 255, 0.2);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 30px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .historyButton {
    position: absolute;
    right: 95px;
    top: 12px;
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 5px;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  .historyButton:hover {
    opacity: 1;
  }

  .specificSuggestionsContainer {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .specificSuggestionCard {
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
  }

  .suggestionHeader {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 15px;
  }

  .textBlock {
    flex: 1;
  }

  .label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #a0a0a5;
    text-transform: uppercase;
    display: block;
    margin-bottom: 5px;
  }

  .originalText, .suggestionText {
    margin: 0;
    padding: 10px;
    border-radius: 6px;
    font-family: 'Menlo', 'Courier New', monospace;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .originalText {
    background-color: rgba(255, 59, 48, 0.15); /* Reddish tint */
    color: #ffb8b3;
  }

  .suggestionText {
    background-color: rgba(52, 199, 89, 0.15); /* Greenish tint */
    color: #b3e6c3;
  }

  .arrow {
    font-size: 2rem;
    color: #a0a0a5;
  }

  .explanation {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 0.9rem;
    color: #c7c7cc;
    line-height: 1.6;
    background-color: rgba(255, 255, 255, 0.05);
    padding: 12px;
    border-radius: 8px;
    border-left: 3px solid #f2f2f7;
  }

  .lightbulb {
    font-size: 1.1rem;
    line-height: 1.6;
  }

  @media (max-width: 600px) {
    .suggestionHeader {
      flex-direction: column;
      align-items: stretch;
    }
    .arrow {
      text-align: center;
      transform: rotate(90deg);
    }
  }
</style>