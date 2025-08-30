import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL } from '$env/static/private';
import { json, error as svelteKitError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ChatMessage } from '$lib/types';

export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const { conversation } = (await request.json()) as { conversation: ChatMessage[] };

    // if (!conversation || conversation.length === 0) {
    //   throw svelteKitError(400, 'Conversation data is required.');
    // }

    const userTranscript = conversation.map(msg => (msg.role) + ": " + msg.content).join('\n');

    const systemPrompt = `
      You are an expert IELTS examiner. Your task is to evaluate a user's conversation transcript based on the four official IELTS speaking criteria. Provide a score from 1-9 for each criterion and an overall band score.

      The criteria are:
      1.  **Fluency and coherence (FC)**: Assess the user's ability to speak at length, the flow of their speech, and the logical connection between their ideas.
      2.  **Lexical Resource (LR)**: Evaluate the range and accuracy of the vocabulary used. Look for idiomatic language and less common words.
      3.  **Grammatical Range and Accuracy (GRA)**: Judge the variety and correctness of grammatical structures.
      4.  **Pronunciation (P)**: Based on the text, you cannot assess actual pronunciation. Instead, evaluate this based on textual cues that might suggest naturalness, such as the use of contractions and conversational phrasing. Acknowledge this limitation in your feedback for this criterion.

      Be more forgiving for the pronounciation error because that might be the limiation of the SST model
      Be more encourging in scoring and marking so the user is more likely to practice again
      Analyze the following transcript of the user's speech:
      ---
${userTranscript}
      ---
      Your response MUST be a valid JSON object. Do not include any text or markdown formatting before or after the JSON object. The JSON object should follow this exact structure:
      {
        "overallScore": <number>,
        "feedback": "<string: Overall feedback on the performance>",
        "scores": {
          "fluencyAndCoherence": { "score": <number>, "feedback": "<string: Detailed feedback for FC>" },
          "lexicalResource": { "score": <number>, "feedback": "<string: Detailed feedback for LR>" },
          "grammaticalRangeAndAccuracy": { "score": <number>, "feedback": "<string: Detailed feedback for GRA>" },
          "pronunciation": { "score": <number>, "feedback": "<string: Detailed feedback for P, acknowledging text limitations>" }
        },
        "suggestionsForImprovement": [
          "<string: Actionable suggestion 1>",
          "<string: Actionable suggestion 2>"
        ],
        "specificSuggestions": [
          {
            "original": "<string: The user's exact phrase from the transcript that needs improvement. Example: 'I went to school using bus.'>",
            "suggestion": "<string: The corrected or improved version of the phrase. Example: 'I went to school by bus.'>",
            "explanation": "<string: A brief, clear reason for the change. Example: 'Use the preposition \\'by\\' when referring to a mode of transport.'>"
          }
        ],
        "conversationSummary": "<string: Summary for the conversation, (and some user performance if applicable) in a way that an LLM would unserstand for context"
      }
    `;

    // 1. Construct the API endpoint URL
    // Use the custom base URL if provided, otherwise default to the official OpenAI URL.
    const apiEndpoint = (OPENAI_BASE_URL || 'https://api.openai.com/v1') + '/chat/completions';

    // 2. Prepare the request body according to the OpenAI API specification.
    const requestBody = {
      model: OPENAI_MODEL || 'gpt-4o-mini', // Provide a fallback model
      messages: [{ role: 'user', content: systemPrompt }],
      response_format: { type: 'json_object' }, // Highly recommended for reliable JSON output
    };

    // 3. Make the API call using the native fetch API.
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    // 4. Robustly handle potential API errors.
    if (!response.ok) {
      const errorBody = await response.json();
      console.error('OpenAI API Error:', errorBody);
      throw svelteKitError(response.status, errorBody.error?.message || 'Failed to communicate with OpenAI API.');
    }

    // 5. Process the successful response.
    const completion = await response.json();
    const reportJson = completion.choices[0].message.content;

    if (!reportJson) {
      throw new Error('OpenAI returned an empty response.');
    }

    const reportData = JSON.parse(reportJson);
    reportData.date = new Date();
    
    return json(reportData);

  } catch (err: any) {
    // Catch both our custom SvelteKit errors and other potential exceptions.
    console.error('API Route Error:', err);
    if (err.status) {
      // Re-throw SvelteKit errors to be handled by the framework
      throw err;
    }
    throw svelteKitError(500, err.message || 'An internal server error occurred.');
  }
};