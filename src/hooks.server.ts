import { initializePodManager } from '$lib/server/podManager';
import type { Handle } from '@sveltejs/kit';

console.log("\n\n--- HOOKS.SERVER.TS WAS CALLED! SERVER IS STARTING/RESTARTING. ---\n\n");

// Initialize the pod manager and its background cron jobs.
// This line is the key to making it work correctly with TypeScript.
initializePodManager();

/**
 * Standard SvelteKit request handler.
 * We don't need to modify requests for this feature, just let them pass through.
 */
export const handle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);
    return response;
};