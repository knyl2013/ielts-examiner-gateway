import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { registerConnection, unregisterConnection } from '$lib/server/podManager';

// This endpoint handles notifying the server about a client's connection status.
export const POST: RequestHandler = async ({ request }) => {
    const { action } = await request.json();

    switch (action) {
        case 'register':
            const res = await registerConnection();
            if (res?.status === "success" && res.podId) {
                const webSocketUrl = `wss://${res.podId}-8000.proxy.runpod.net/v1/realtime`;
                return json({ success: true, message: 'Connection registered.', podId: res.podId, webSocketUrl: webSocketUrl });
            } else {
                return json({ success: false, message: 'Connection failed.'})
            }        
        case 'unregister':
            unregisterConnection();
            return json({ success: true, message: 'Connection unregistered.' });
        
        default:
            throw error(400, 'Invalid action specified. Use "register" or "unregister".');
    }
};