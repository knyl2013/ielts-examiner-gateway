<script lang="ts">
    import { onMount } from 'svelte';
    import { userStore, type SpecificSuggestion, type ReportData } from '$lib/stores';
    import type { User } from 'firebase/auth';
    import { db, firebaseEnabled } from '$lib/firebase';
    import { collection, query, where, getDocs } from 'firebase/firestore';
    import { goto } from '$app/navigation';
    import Login from '$lib/components/Login.svelte';
    import HistoryButton from '$lib/components/HistoryButton.svelte';

    // --- TYPE DEFINITIONS ---
    type QuizStatus = 'loading' | 'ready' | 'in_progress' | 'finished' | 'no_questions';

    interface QuizQuestion {
        id: number;
        original: string;
        suggestion: string;
        explanation: string;
        options: string[]; // [original, suggestion] but shuffled
        correctAnswer: string;
    }

    interface UserAnswer {
        question: QuizQuestion;
        selected: string;
        isCorrect: boolean;
    }

    // --- STATE MANAGEMENT ---
    let status: QuizStatus = 'loading';
    let quizQuestions: QuizQuestion[] = [];
    let currentQuestionIndex = 0;
    let userAnswers: UserAnswer[] = [];
    let answerFeedback: 'correct' | 'incorrect' | 'idle' = 'idle';

    // --- CORE LOGIC ---
    onMount(() => {
        // This ensures we wait for the user state to be determined (logged in, out, or undefined)
        const unsubscribe = userStore.subscribe((user) => {
            if (user !== undefined) {
                initializeQuiz(user);
                unsubscribe(); // We only need to run this once on page load
            }
        });
    });

    const initializeQuiz = async (user: User | null) => {
        try {
            status = 'loading';
            const allSuggestions = await fetchAllSuggestions(user);

            // We need at least one suggestion to start a quiz
            if (allSuggestions.length < 1) {
                status = 'no_questions';
                return;
            }
            
            const selectedSuggestions = selectRandomQuestions(allSuggestions, 5);
            quizQuestions = prepareQuiz(selectedSuggestions);
            status = 'ready';
        } catch (error) {
            console.error('Failed to initialize quiz:', error);
            status = 'no_questions'; // Treat error as no questions available
        }
    };

    const fetchAllSuggestions = async (user: User | null): Promise<SpecificSuggestion[]> => {
        let allSuggestions: SpecificSuggestion[] = [];

        if (user) {
            // Logged-in user: Fetch from Firestore
            const reportsQuery = query(collection(db, 'reports'), where('userId', '==', user.uid));
            const querySnapshot = await getDocs(reportsQuery);
            querySnapshot.forEach((doc) => {
                const data = doc.data() as ReportData;
                if (data.specificSuggestions && data.specificSuggestions.length > 0) {
                    allSuggestions.push(...data.specificSuggestions);
                }
            });
        } else {
            // Anonymous user: Fetch from LocalStorage
            const rawHistory = localStorage.getItem('reportHistory');
            if (rawHistory) {
                const history: ReportData[] = JSON.parse(rawHistory);
                history.forEach((report) => {
                    if (report.specificSuggestions && report.specificSuggestions.length > 0) {
                        allSuggestions.push(...report.specificSuggestions);
                    }
                });
            }
        }
        // Deduplicate suggestions based on the original text to avoid very similar questions
        const uniqueSuggestions = new Map<string, SpecificSuggestion>();
        allSuggestions.forEach(s => uniqueSuggestions.set(s.original, s));
        return Array.from(uniqueSuggestions.values());
    };

    const selectRandomQuestions = (suggestions: SpecificSuggestion[], max: number): SpecificSuggestion[] => {
        // Shuffle the array and take the first `max` items
        const shuffled = suggestions.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(max, suggestions.length));
    };

    const prepareQuiz = (suggestions: SpecificSuggestion[]): QuizQuestion[] => {
        return suggestions.map((item, index) => {
            const options = [item.original, item.suggestion];
            // Randomize options order
            if (Math.random() > 0.5) {
                options.reverse();
            }
            return {
                id: index,
                ...item,
                options: options,
                correctAnswer: item.suggestion
            };
        });
    };
    
    const handleAnswer = (selectedOption: string) => {
        if (answerFeedback !== 'idle') return; // Prevent multiple clicks

        const currentQuestion = quizQuestions[currentQuestionIndex];
        const isCorrect = selectedOption === currentQuestion.correctAnswer;
        
        answerFeedback = isCorrect ? 'correct' : 'incorrect';

        userAnswers.push({
            question: currentQuestion,
            selected: selectedOption,
            isCorrect: isCorrect
        });

        // Wait a moment to show feedback, then proceed
        setTimeout(() => {
            answerFeedback = 'idle';
            if (currentQuestionIndex < quizQuestions.length - 1) {
                currentQuestionIndex++;
            } else {
                status = 'finished';
            }
        }, 1200);
    };

    const startQuiz = () => {
        status = 'in_progress';
        currentQuestionIndex = 0;
        userAnswers = [];
    };

    const goBack = () => {
        goto('/');
    };

    const restartQuiz = () => {
        status = 'ready';
    };

    const calculateScore = () => userAnswers.filter((a) => a.isCorrect).length;

</script>

<div class="quizContainer">
    <header class="header">
        <button class="backButton" on:click={goBack} aria-label="Back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="white"/>
            </svg>
        </button>
        <HistoryButton />
        {#if firebaseEnabled}
            <Login />
        {/if}
    </header>

    <main class="mainContent">
        {#if status === 'loading'}
            <div class="statusContainer">
                <div class="spinner"></div>
                <h1 class="statusTitle">Preparing Your Quiz</h1>
                <p class="statusSubtitle">Finding questions from your past conversations...</p>
            </div>
        {:else if status === 'no_questions'}
            <div class="statusContainer">
                <h1 class="statusTitle">Not Enough Questions</h1>
                <p class="statusSubtitle">
                    We need at least one "Specific Suggestion" from a past report to create a quiz. <br />
                    Try having a conversation first!
                </p>
                <button on:click={goBack} class="actionButton start">Back to Home</button>
            </div>
        {:else if status === 'ready'}
            <div class="statusContainer">
                <h1 class="statusTitle">Quiz Ready!</h1>
                <p class="statusSubtitle">You have {quizQuestions.length} questions ready for review.</p>
                <button on:click={startQuiz} class="actionButton start">Start Quiz</button>
            </div>
        {:else if status === 'in_progress'}
            {@const currentQuestion = quizQuestions[currentQuestionIndex]}
            <div class="quizInProgressContainer">
                <div class="progressIndicator">Question {currentQuestionIndex + 1} of {quizQuestions.length}</div>
                <h2 class="questionPrompt">Which sentence is more natural or correct?</h2>
                <div class="optionsContainer">
                    {#each currentQuestion.options as option}
                        <button
                            class="optionButton"
                            class:correct={answerFeedback !== 'idle' && option === currentQuestion.correctAnswer}
                            class:incorrect={answerFeedback === 'incorrect' && option === userAnswers[userAnswers.length - 1]?.selected}
                            on:click={() => handleAnswer(option)}
                            disabled={answerFeedback !== 'idle'}
                        >
                            {option}
                        </button>
                    {/each}
                </div>
            </div>
        {:else if status === 'finished'}
            <div class="resultsContainer">
                <section class="overallScoreSection">
                    <h1 class="statusTitle">Quiz Complete!</h1>
                    <div class="scoreCircle">{calculateScore()} / {quizQuestions.length}</div>
                    <p class="overallFeedback">
                        Great job reviewing! Repetition is key to improvement.
                    </p>
                    <button class="actionButton start" on:click={restartQuiz}>Try Again</button>
                </section>
                
                <section class="reviewSection">
                    <h2 class="sectionTitle">Review Your Answers</h2>
                    <div class="specificSuggestionsContainer">
                        {#each userAnswers as answer, i (answer.question.id)}
                            <div class="specificSuggestionCard" class:correctReview={answer.isCorrect} class:incorrectReview={!answer.isCorrect}>
                                <div class="suggestionHeader">
                                    <div class="textBlock">
                                        <span class="label">What you said:</span>
                                        <p class="originalText" class:selected={answer.selected === answer.question.original}>
                                            "{answer.question.original}"
                                        </p>
                                    </div>
                                    <div class="arrow">→</div>
                                    <div class="textBlock">
                                        <span class="label">Could be better:</span>
                                        <p class="suggestionText" class:selected={answer.selected === answer.question.suggestion}>
                                            "{answer.question.suggestion}"
                                        </p>
                                    </div>
                                </div>
                                <div class="explanation">
                                    <span class="lightbulb">💡</span>
                                    {answer.question.explanation}
                                </div>
                            </div>
                        {/each}
                    </div>
                </section>
            </div>
        {/if}
    </main>
</div>

<style>
    /* --- Base Container & Header (from your example) --- */
    .quizContainer {
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
    .header {
        padding: 20px 20px 20px;
        text-align: center;
        position: relative;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .backButton {
        position: absolute;
        left: 15px;
        top: 35px;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 5px;
    }
    .headerTitle p {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 500;
    }

    /* --- Main Content Layout --- */
    .mainContent {
        flex-grow: 1;
        overflow-y: auto;
        padding: 10px 30px 30px 30px;
        display: flex;
        flex-direction: column;
    }
    .mainContent::-webkit-scrollbar { display: none; }
    .mainContent { -ms-overflow-style: none; scrollbar-width: none; }

    /* --- Status & Results Screens (Shared Styles) --- */
    .statusContainer, .resultsContainer {
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
    .statusSubtitle {
        font-size: 1rem;
        color: #d1d1d6;
        margin-bottom: 40px;
        max-width: 500px;
        line-height: 1.5;
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
    @keyframes spin { to { transform: rotate(360deg); } }

    /* --- Action Button --- */
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
    .actionButton:active { transform: scale(0.98); }
    .actionButton.start { background-color: #34c759; }
    .actionButton.start:hover { background-color: #45d160; }

    /* --- In-Progress Quiz Styles --- */
    .quizInProgressContainer {
        width: 100%;
        max-width: 700px;
        margin: auto;
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }
    .progressIndicator {
        text-align: center;
        font-size: 0.9rem;
        color: #a0a0a5;
        font-weight: 500;
    }
    .questionPrompt {
        font-size: 1.5rem;
        font-weight: 500;
        text-align: center;
        line-height: 1.4;
    }
    .optionsContainer {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    .optionButton {
        padding: 20px;
        font-size: 1.1rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: white;
        border-radius: 12px;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s ease-in-out;
        width: 100%;
    }
    .optionButton:not(:disabled):hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
    }
    .optionButton:disabled { cursor: not-allowed; }
    .optionButton.correct {
        background-color: rgba(52, 199, 89, 0.25);
        border-color: #34c759;
        transform: scale(1.02);
    }
    .optionButton.incorrect {
        background-color: rgba(255, 59, 48, 0.25);
        border-color: #ff3b30;
    }

    /* --- Results Screen Specifics --- */
    .overallScoreSection {
        text-align: center;
        margin-bottom: 30px;
        width: 100%;
    }
    .scoreCircle {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 10px auto 20px;
        font-size: 2.5rem; /* Adjusted for X/Y format */
        font-weight: 700;
        background: rgba(0,0,0,0.15);
        border: 2px solid rgba(255, 255, 255, 0.2);
    }
    .overallFeedback {
        font-size: 1rem;
        color: #e0e0e0;
        max-width: 600px;
        margin: 0 auto 30px auto;
        line-height: 1.5;
    }
    .reviewSection {
        width: 100%;
        max-width: 800px;
    }
    .sectionTitle {
        font-size: 1.4rem;
        font-weight: 600;
        margin-top: 20px;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    }

    /* --- Review Card Styles (reused and adapted) --- */
    .specificSuggestionsContainer { display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px; }
    .specificSuggestionCard { background: rgba(0, 0, 0, 0.15); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; transition: border 0.3s; }
    .suggestionHeader { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
    .textBlock { flex: 1; }
    .label { font-size: 0.8rem; font-weight: 500; color: #a0a0a5; text-transform: uppercase; display: block; margin-bottom: 5px; }
    .originalText, .suggestionText { margin: 0; padding: 10px; border-radius: 6px; font-family: 'Menlo', 'Courier New', monospace; font-size: 0.95rem; line-height: 1.5; border: 2px solid transparent; transition: border-color 0.3s;}
    .originalText { background-color: rgba(255, 59, 48, 0.15); color: #ffb8b3; }
    .suggestionText { background-color: rgba(52, 199, 89, 0.15); color: #b3e6c3; }
    .arrow { font-size: 2rem; color: #a0a0a5; }
    .explanation { display: flex; align-items: flex-start; gap: 10px; font-size: 0.9rem; color: #c7c7cc; line-height: 1.6; background-color: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 8px; border-left: 3px solid #f2f2f7; }
    .lightbulb { font-size: 1.1rem; line-height: 1.6; }
    
    /* Review-specific styles */
    .correctReview { border-left: 4px solid #34c759; }
    .incorrectReview { border-left: 4px solid #ff3b30; }
    .originalText.selected { border-color: #ff3b30; }
    .suggestionText.selected { border-color: #34c759; }

    @media (max-width: 600px) {
        .suggestionHeader { flex-direction: column; align-items: stretch; }
        .arrow { text-align: center; transform: rotate(90deg); }
    }
</style>