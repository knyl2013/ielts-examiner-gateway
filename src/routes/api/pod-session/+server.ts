import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { registerConnection, unregisterConnection } from '$lib/server/podManager';
import { LOCALHOST_AI } from '$env/static/private';

// This endpoint handles notifying the server about a client's connection status.
export const POST: RequestHandler = async ({ request }) => {
    const { action } = await request.json();
    const isLocalAi = LOCALHOST_AI === 'true';
    switch (action) {
        case 'register':
            if (isLocalAi) {
                console.log('Using local AI WebSocket: ws://localhost:8000');
                const webSocketUrl = 'ws://localhost:8000';
                return json({ success: true, message: 'Using local AI.', webSocketUrl: webSocketUrl });
            } else {
                const res = await registerConnection();
                if (res?.status === "success" && res.podId) {
                    const webSocketUrl = `wss://${res.podId}-8000.proxy.runpod.net/v1/realtime`;
                    return json({ success: true, message: 'Connection registered.', podId: res.podId, webSocketUrl: webSocketUrl });
                } else {
                    return json({ success: false, message: 'Connection failed.' });
                }
            }
        case 'unregister':
            if (isLocalAi) {
                return json({ success: true, message: 'Local AI connection; no unregister needed.' });
            } else {
                unregisterConnection();
                return json({ success: true, message: 'Connection unregistered.' });
            }
        default:
            throw error(400, 'Invalid action specified. Use "register" or "unregister".');
    }
};