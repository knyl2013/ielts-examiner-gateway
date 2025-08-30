import { RUNPOD_API_KEY } from '$env/static/private';
import { error } from '@sveltejs/kit';

// --- State ---
let isInitialized = false;
let activePodId: string | null = null;
let activeConnections = 0;
const cleanupTimers = new Map<string, NodeJS.Timeout>();

// --- Constants ---
const SHUTDOWN_GRACE_PERIOD_MS = 30 * 60 * 1000;
const IDLE_POD_CLEANUP_MS = 30 * 60 * 1000;
const CRON_JOB_INTERVAL_MS = 5 * 60 * 1000; // 5-minute cron interval

const RUNPOD_API_BASE_URL = 'https://rest.runpod.io/v1';

const POD_CREATE_CONFIG = {
    "cloudType": "SECURE",
    "name": "SvelteKit On-Demand Pod",
    "gpuTypeIds": ["NVIDIA GeForce RTX 4090"],
    "containerDiskInGb": 20,
    "volumeInGb": 20,
    "ports": ["8000/http","22/tcp"],
    "templateId": "ogn0w7m9jb",
    "gpuCount": 1
};


// --- Core Pod Management Functions (Stop, Terminate, Start, etc.) ---

/**
 * Stops the currently active pod. Does NOT clear activePodId.
 */
async function stopPod(podIdToStop: string) {
    console.log(`[STOP] Requesting to stop pod ${podIdToStop}.`);
    const stopUrl = `${RUNPOD_API_BASE_URL}/pods/${podIdToStop}/stop`;
    try {
        const response = await fetch(stopUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` }
        });
        if (!response.ok && response.status !== 409) { // 409 Conflict can mean it's already stopped
            console.error(`[STOP] Failed to stop pod ${podIdToStop}. Status: ${response.status}`, await response.text());
        } else {
            console.log(`[STOP] Successfully requested to stop pod ${podIdToStop}.`);
            // If this was our active pod, reset its connection state
            if (activePodId === podIdToStop) {
                console.log(`[STATE] Pod stopped. Resetting connection count and clearing shutdown timer.`);
                activeConnections = 0;
            }
        }
    } catch (e) {
        console.error(`[STOP] An error occurred while stopping pod ${podIdToStop}:`, e);
    }
}

/**
 * Terminates (deletes) a specific pod. Used for garbage collection.
 */
async function terminatePod(podIdToTerminate: string) {
    console.log(`[TERMINATE] Attempting to terminate pod ${podIdToTerminate}.`);
    if (!RUNPOD_API_KEY) {
        console.error("TERMINATE_POD_ERROR: RUNPOD_API_KEY env var not set.");
        return;
    }
    // Clear any pending cleanup timer for this pod
    if (cleanupTimers.has(podIdToTerminate)) {
        clearTimeout(cleanupTimers.get(podIdToTerminate)!);
        cleanupTimers.delete(podIdToTerminate);
        console.log(`[TERMINATE] Cleared background cleanup timer for ${podIdToTerminate}.`);
    }

    const terminateUrl = `${RUNPOD_API_BASE_URL}/pods/${podIdToTerminate}/terminate`;

    try {
        await fetch(terminateUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` }
        });

        console.log(`[TERMINATE] Successfully requested termination for pod ${podIdToTerminate}.`);
    } catch (e) {
        console.error(`[TERMINATE] An error occurred while terminating pod ${podIdToTerminate}:`, e);
    } finally {
        // If this was our active pod, reset the server's state
        if (activePodId === podIdToTerminate) {
            console.log("[STATE] Resetting active pod state.");
            activePodId = null;
            activeConnections = 0;
        }
    }

}

/**
 * Starts a stopped pod.
 */
async function startPod(podId: string): Promise<boolean> {
    console.log(`Attempting to start existing pod ${podId}...`);
    const startUrl = `${RUNPOD_API_BASE_URL}/pods/${podId}/start`;
    try {
        const response = await fetch(startUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` }
        });
        if (!response.ok) {
            console.error(`Failed to start pod ${podId}. Status: ${response.status}`, await response.text());
            return false;
        }
        console.log(`Successfully requested to start pod ${podId}.`);
        return true;
    } catch (e) {
        console.error(`An error occurred while starting pod ${podId}:`, e);
        return false;
    }
}

/**
 * Fetches details for a single pod to check its status.
 */
async function getPodDetails(podId: string): Promise<any | null> {
    const url = `${RUNPOD_API_BASE_URL}/pods/${podId}`;
    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` } });
        if (!response.ok) {
            // If a 404, it means the pod was terminated elsewhere.
            if (response.status === 404) {
                console.log(`[STATE] Pod ${podId} not found. It was likely terminated.`);
                return null;
            }
            console.error(`[STATE] Failed to get pod details for ${podId}. Status: ${response.status}`);
            return null;
        }
        return (await response.json()).pod;
    } catch (e) {
        console.error(`[STATE] Error fetching details for pod ${podId}:`, e);
        return null;
    }
}


// --- Cron Job and Cleanup Logic ---

/**
 * The main logic for the cron job.
 */
async function checkAndStopInactivePods() {
    console.log('[CRON] Running periodic check for inactive pods...');
    const allPods = await listPods() || [];
    for (const pod of allPods) {
        if (pod && pod.id) {
            const shouldStop = !cleanupTimers || !cleanupTimers.has(pod.id);
            if (shouldStop) {
                stopPod(pod.id);
                console.log(`[CRON] Found inactive pod ${activePodId}. Initiating stop.`);
            } 
        }
    }
}

/**
 * Initializes all background processes for the pod manager.
 * This should be called once on server startup.
 */
export function initializePodManager() {
    if (isInitialized) {
        return; // Prevent running more than once
    }
    isInitialized = true;

    // Start the cron job for checking on the active pod
    setInterval(checkAndStopInactivePods, CRON_JOB_INTERVAL_MS);
    
    console.log(`[INIT] Pod Manager Initialized.`);
    console.log(`[CRON] Inactivity-check cron job started. Runs every ${CRON_JOB_INTERVAL_MS / 60000} minutes.`);

    // You could also run an initial cleanup of all pods on startup here
    // listPods().then(pods => pods && scheduleCleanupForIdlePods(pods, null));
}

// --- Public API for Server Routes ---

/**
 * Registers a client connection. Acquires and ensures a pod is running.
 */
export async function registerConnection() {
    // If we are already managing a pod, ensure it's running.
    if (activePodId) {
        const pod = await getPodDetails(activePodId);
        if (pod) {
            if (pod.desiredStatus === 'STOPPED') {
                console.log(`[STATE] Active pod ${activePodId} is stopped. Requesting start...`);
                await startPod(activePodId);
                // Add a small delay to allow pod to begin starting up, can be adjusted
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } else {
            // The pod we thought was active doesn't exist anymore. Reset state.
            activePodId = null;
        }
    }

    // If we don't have a pod after the check, get a new or reusable one.
    if (!activePodId) {
        console.log("[STATE] No active pod. Acquiring one...");
        const podId = await getOrCreatePod(); // This function reuses/creates
        if (podId) {
            activePodId = podId;
        } else {
            console.error("CRITICAL: Failed to get or create a pod.");
            return { status: "fail", podId: null };
        }
    }

    activeConnections++;
    console.log(`[STATE] Connection registered. Active connections: ${activeConnections}. Pod: ${activePodId}`);
    
    console.log(`[CLEANUP] Scheduling 30-minute termination for idle pod ${activePodId}.`);
    if (cleanupTimers.has(activePodId!)) {
        clearTimeout(cleanupTimers.get(activePodId!));
        console.log("[STATE] Active pod timer canceled due to new activity.");
    }
    const timer = setTimeout(() => {
        console.log(`[CLEANUP] Idle timer expired for pod ${activePodId}.`);
        terminatePod(activePodId!);
    }, SHUTDOWN_GRACE_PERIOD_MS);
    cleanupTimers.set(activePodId!, timer);
    return { status: "success", podId: activePodId };
}

/**
 * Unregisters a client connection. Starts a 5-minute timer to *stop* the pod.
 */
export function unregisterConnection() {
    activeConnections = Math.max(0, activeConnections - 1);
    if (activePodId && activeConnections === 0) {
        stopPod(activePodId);
    }
    console.log(`[STATE] Connection unregistered. Active connections: ${activeConnections}`);
}

/**
 * Schedules a 30-minute termination timer for any pod that is not the active one.
 * This acts as a garbage collector for orphaned pods.
 * @param allPods - The list of all pods from the API.
 * @param currentActivePodId - The ID of the pod we are using, which should NOT be cleaned up.
 */
function scheduleCleanupForIdlePods(allPods: any[], currentActivePodId: string | null) {
    console.log(`[CLEANUP] Scanning ${allPods.length} pods for background cleanup scheduling.`);
    for (const pod of allPods) {
        // Don't schedule cleanup for the pod we are actively using
        if (pod.id === currentActivePodId) {
            continue;
        }
        // If a cleanup timer already exists for this pod, do nothing
        if (cleanupTimers.has(pod.id)) {
            continue;
        }

        console.log(`[CLEANUP] Scheduling 30-minute termination for idle pod ${pod.id}.`);
        const timer = setTimeout(() => {
            console.log(`[CLEANUP] Idle timer expired for pod ${pod.id}.`);
            terminatePod(pod.id);
        }, IDLE_POD_CLEANUP_MS);

        cleanupTimers.set(pod.id, timer);
    }
}

/**
 * Gets a pod, prioritizing reusing a stopped one, and creating one as a fallback.
 * Also triggers the cleanup scheduling for all other pods.
 */
async function getOrCreatePod(): Promise<string | null> {
    const reusablePods = (await listPods()) || [];

    console.log("Found pods: ", reusablePods);
    
    let chosenPodId: string | null = null;
    for (const reusablePod of reusablePods) {
        if (reusablePod) {
            console.log(`Found reusable stopped pod: ${reusablePod.id}. Attempting to start...`);
            if (await startPod(reusablePod.id)) {
                chosenPodId = reusablePod.id;
                console.log(`
    /**************************************************/
    ***   Successfully restarted existing pod!   ***
    ***      POD ID: ${chosenPodId}      ***
    /**************************************************/
                `);
                // Since we're using this pod, cancel its cleanup timer if it exists
                if (chosenPodId && cleanupTimers.has(chosenPodId)) {
                    console.log(`[CLEANUP] Canceling background cleanup for reactivated pod ${chosenPodId}.`);
                    clearTimeout(cleanupTimers.get(chosenPodId)!);
                    cleanupTimers.delete(chosenPodId);
                }
                break;
            }
        }
    }
    
    // Schedule cleanup for all pods, making sure to exclude the one we just chose
    scheduleCleanupForIdlePods(reusablePods, chosenPodId);

    // If we couldn't reuse a pod, create a new one
    if (!chosenPodId) {
        console.log("No suitable stopped pod found or failed to start. Creating a new one...");
        chosenPodId = await createAndStartPod();
        if (chosenPodId) {
            console.log(`
/**************************************************/
 ***      Successfully created new pod!       ***
 ***      POD ID: ${chosenPodId}      ***
/**************************************************/
            `);
        }
    }

    return chosenPodId;
}
/**
 * Fetches a list of all pods on the account.
 */
async function listPods(): Promise<any[] | null> {
    console.log("Fetching list of existing pods...");
    const listUrl = `${RUNPOD_API_BASE_URL}/pods`;
    try {
        const response = await fetch(listUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` }
        });
        if (!response.ok) {
            console.error(`Failed to list pods. Status: ${response.status}`);
            return null;
        }
        const data = await response.json();
        return data || [];
    } catch (e) {
        console.error("An error occurred while listing pods:", e);
        return null;
    }
}
/**
 * Creates a new pod on RunPod and returns its ID.
 */
async function createAndStartPod(): Promise<string | null> {
    console.log("No suitable stopped pod found. Creating a new one...");
    if (!RUNPOD_API_KEY) {
        console.error("CREATE_POD_ERROR: RUNPOD_API_KEY env var not set.");
        return null;
    }
    const createUrl = `${RUNPOD_API_BASE_URL}/pods`;
    try {
        const response = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(POD_CREATE_CONFIG)
        });
        const responseData = await response.json();
        if (!response.ok) {
            console.error(`Failed to create RunPod pod. Status: ${response.status}`, responseData);
            return null;
        }
        console.log(`Successfully created pod. Full response:`, responseData);
        return responseData.id;
    } catch (e) {
        console.error("An error occurred while creating the pod:", e);
        return null;
    }
}