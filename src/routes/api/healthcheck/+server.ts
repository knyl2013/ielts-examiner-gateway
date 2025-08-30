import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
    const { podId } = (await request.json()) as { podId: string };

    if (!podId) {
        console.error("podId variable is not set.");
        throw error(500, 'Server configuration error.');
    }
    

    const healthcheckUrl = `https://${podId}-8000.proxy.runpod.net/metrics`;

    try {
        const response = await fetch(healthcheckUrl, {
            method: 'GET',
        });

        if (!response.ok) {
            return json({ status: "offline" });
        }
    } catch (e: any) {
        console.log("Error while doing health check, err:", e);
        return json({ status: "offline" });
    }

    return json({ status: "online" });
};