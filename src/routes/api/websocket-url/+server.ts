// src/routes/api/websocket-url/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { RUNPOD_API_KEY, POD_ID } from '$env/static/private';

// This is our new serverless function (API endpoint).
// It handles POST requests to `/api/websocket-url`.
export const POST: RequestHandler = async () => {

    if (!POD_ID || !RUNPOD_API_KEY) {
        console.error("POD_ID OR RUNPOD_API_KEY environment variables are not set.");
        throw error(500, 'Server configuration error.');
    }

    // const startUrl = `https://rest.runpod.io/v1/pods/${podId}/start`;

    // try {
    //     const response = await fetch(startUrl, {
    //         method: 'POST',
    //         headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` }
    //     });

    //     if (!response.ok) {
    //         const errorBody = await response.json();
    //         console.error(`Failed to start RunPod pod ${podId}. Status: ${response.status}`, errorBody);
    //         throw error(502, 'Failed to start the backend service.');
    //     }

    //     console.log(`Successfully started or confirmed pod ${podId} is running.`);

    // } catch (e: any) {
    //     console.error("An error occurred while trying to start the RunPod pod:", e);
    //     if (e.status) throw e; 
    //     throw error(500, 'An internal error occurred.');
    // }

    const webSocketUrl = `wss://${POD_ID}-8000.proxy.runpod.net/v1/realtime`;

    return json({ url: webSocketUrl });
};