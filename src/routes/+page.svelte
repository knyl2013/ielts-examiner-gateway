<script lang="ts">
    import { goto } from '$app/navigation';
    import Login from '$lib/components/Login.svelte';

    const handleStart = () => {
        goto('/call');
    };
</script>

<header class="header">
    <div>
        <button class="historyButton" on:click={() => goto('/history')} aria-label="View History">
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

<div class="pageContainer">
    <main class="scrollableContent">
        <section class="featureSection">
            <div class="textContent">
                <h1 class="headline">Master Your IELTS Speaking.</h1>
                <p class="sub-headline">
                    Practice with an AI examiner anytime, anywhere. Get instant, detailed feedback to boost
                    your confidence and your score.
                </p>
            </div>
            <img src="/screenshots/call.png" alt="IELTS AI Examiner call screen" class="screenshot" />
        </section>

        <section class="featureSection">
            <div class="textContent">
                <h2 class="headline">Receive Your AI-Powered Report.</h2>
                <p class="sub-headline">
                    Finish a conversation and immediately see your estimated IELTS band score, just like the
                    real test.
                </p>
            </div>
            <img
                src="/screenshots/report-score.png"
                alt="IELTS report showing an overall score"
                class="screenshot"
            />
        </section>

        <section class="featureSection">
            <div class="textContent">
                <h2 class="headline">Get Actionable Advice.</h2>
                <p class="sub-headline">
                    Don't just see your score. Understand exactly how to improve with specific, word-for-word
                    suggestions on grammar, vocabulary, and phrasing.
                p>
            </div>
            <img
                src="/screenshots/suggestions.png"
                alt="Specific suggestions for improving spoken English"
                class="screenshot"
            />
        </section>

        <section class="featureSection">
            <div class="textContent">
                <h2 class="headline">Track Your Journey to Success.</h2>
                <p class="sub-headline">
                    Watch your score progress over time. Our detailed history and charts help you identify
                    patterns and focus your efforts where they matter most.
                </p>
            </div>
            <img
                src="/screenshots/progress.png"
                alt="Chart showing IELTS score progression over time"
                class="screenshot"
            />
        </section>

        <section class="featureSection">
            <div class="textContent">
                <h2 class="headline">Practice with Confidence.</h2>
                <p class="sub-headline">
                    Your privacy is our priority. We never save your audio recordings. See the code on
                    <a
                        href="https://github.com/knyl2013/ielts-examiner-frontend"
                        target="_blank"
                        rel="noopener noreferrer">GitHub</a
                    >.
                </p>
            </div>
            <a
                href="https://github.com/knyl2013/ielts-examiner-frontend"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View source code on GitHub"
            >
                <svg
                    class="logo-image"
                    viewBox="0 0 98 96"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="white"
                    role="img"
                    aria-label="GitHub Logo"
                >
                    <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-2.913.324-2.913 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.158 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.69C97.707 22 75.788 0 48.854 0z"
                    />
                </svg>
            </a>
        </section>
    </main>

    <footer class="fixedCtaFooter">
        <button class="ctaButton" on:click={handleStart}> Start Practicing for Free </button>
    </footer>
</div>

<style>
    :global(body) {
        margin: 0;
        background: radial-gradient(circle at 50% 50%, #5a4743, #3a2723);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
            sans-serif;
        color: #ffffff;
    }

    .pageContainer {
        width: 100%;
    }

    .scrollableContent {
        padding-bottom: 120px;
    }

    .featureSection {
        min-height: 100vh;
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 60px 20px;
        box-sizing: border-box;
    }

    .textContent {
        max-width: 700px;
        margin-bottom: 50px;
    }

    .headline {
        font-size: clamp(2.5rem, 6vw, 4.5rem);
        font-weight: 700;
        margin: 0 0 15px 0;
        letter-spacing: -0.02em;
    }

    .sub-headline {
        font-size: clamp(1rem, 2.5vw, 1.5rem);
        font-weight: 400;
        color: #d1d1d6;
        line-height: 1.5;
        max-width: 550px;
        margin: 0 auto;
    }

    .screenshot {
        max-width: 380px;
        width: 80%;
        border-radius: 30px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
        transition: transform 0.3s ease;
    }

    .screenshot:hover {
        transform: scale(1.03);
    }

    .fixedCtaFooter {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        z-index: 100;
        display: flex;
        justify-content: center;
        align-items: center;
        padding-bottom: 20px;
        background: linear-gradient(
            to top,
            rgba(58, 39, 35, 1) 20%,
            rgba(58, 39, 35, 0.8) 70%,
            rgba(58, 39, 35, 0)
        );
        pointer-events: none;
    }

    .ctaButton {
        background-color: #34c759;
        color: white;
        font-size: 1.1rem;
        font-weight: 600;
        border: none;
        border-radius: 9999px;
        padding: 18px 35px;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.2s ease;
        pointer-events: auto;
    }

    .ctaButton:hover {
        background-color: #34c759;
        transform: scale(1.05);
    }

    .header {
        padding: 50px 20px 20px;
        text-align: center;
        position: relative;
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

    .sub-headline a {
        color: #34c759; /* Use the bright green from the CTA button */
        font-weight: 500;
        text-decoration: none;
        border-bottom: 1px solid #34c759;
        padding-bottom: 1px;
        transition: color 0.2s ease, border-color 0.2s ease;
    }

    .sub-headline a:hover {
        color: #ffffff;
        border-color: #ffffff;
    }

    .logo-image {
        max-width: 120px;
        width: 30%;
        opacity: 0.8;
        transition: transform 0.3s ease, opacity 0.3s ease;
    }

    .logo-image:hover {
        transform: scale(1.05);
        opacity: 1;
    }
</style>