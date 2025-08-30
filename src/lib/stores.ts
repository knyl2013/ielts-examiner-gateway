import { readable, writable } from 'svelte/store';
import type { ChatMessage } from './chatHistory';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '$lib/firebase';
import { get } from 'svelte/store';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

/**
 * A readable Svelte store that updates with the current Date every second.
 * It automatically handles starting and stopping the interval, so it's
 * highly efficient and won't run when no components are listening to it.
 */
export const now = readable(new Date(), (set) => {
  const interval = setInterval(() => {
    set(new Date());
  }, 1000);

  // This cleanup function is called by Svelte when the last subscriber unsubscribes
  return () => {
    clearInterval(interval);
  };
});

export interface SpecificSuggestion {
  original: string;
  suggestion: string;
  explanation: string;
}

export interface ReportData {
  date: Date;
  overallScore: number;
  feedback: string;
  scores: {
    fluencyAndCoherence: { score: number; feedback: string };
    lexicalResource: { score: number; feedback: string };
    grammaticalRangeAndAccuracy: { score: number; feedback: string };
    pronunciation: { score: number; feedback: string };
  };
  suggestionsForImprovement: string[];
  specificSuggestions?: SpecificSuggestion[];
  conversationSummary: string;
  callDuration?: number; // in seconds
}

interface ReportState {
  status: 'idle' | 'generating' | 'success' | 'error';
  data: ReportData | null;
  error: string | null;
}

export interface UserSettings {
  memory: boolean;
}

export interface UserProfile {
    settings: UserSettings;
    plan: 'signed' | 'plus';
}

export const userSettingsStore = writable<UserSettings>({ memory: false });

export const userStore = readable<User | null | undefined>(undefined, (set) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    set(user);
  });
  return () => unsubscribe();
});

export const userProfileStore = writable<UserProfile | null>(null);

userStore.subscribe(async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            // Construct the full user profile
            const profile: UserProfile = {
                settings: data.settings || { memory: false },
                plan: data.plan || 'signed' // Default to 'signed' for existing users without a plan field
            };
            userProfileStore.set(profile);
            userSettingsStore.set(profile.settings);
        } else {
            // First-time user or no settings, create default and set it
            const defaultSettings: UserSettings = { memory: false };
            await setDoc(userDocRef, { settings: defaultSettings }, { merge: true });
            userSettingsStore.set(defaultSettings);
        }
    } else {
        // User is logged out, reset to default state
        userSettingsStore.set({ memory: false });
    }
});

export const updateUserSettings = async (settings: Partial<UserSettings>) => {
    const currentUser = get(userStore);
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, { settings }, { merge: true });
};

// Create the writable store with an initial state
export const reportStore = writable<ReportState>({
  status: 'idle',
  data: null,
  error: null,
});

export const reportHistoryStore = writable<ReportData[]>([]);

export const generateReport = async (chatHistory: ChatMessage[], isReportReady: boolean, callDuration: number) => {
  reportStore.set({ status: 'generating', data: null, error: null });

  const currentUser = get(userStore);

  try {
    if (!isReportReady) {
      throw new Error("Not enough conversation data to generate a report. Please try again and chat for a bit longer.");
    }

    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation: chatHistory }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate report.');
    }

    const reportData: ReportData = await response.json();
    
    if (currentUser) {
      await addDoc(collection(db, 'reports'), {
        ...reportData,
        userId: currentUser.uid,
        date: new Date(),
        callDuration: callDuration
      });
    } else {
      const reportHistory = JSON.parse(localStorage.getItem('reportHistory') || '[]') || [];
      const newReportHistory = [...reportHistory, {
        ...reportData,
        date: new Date(),
        callDuration: callDuration
      }];
      localStorage.setItem('reportHistory', JSON.stringify(newReportHistory));
    }

    // update from 'generating' to show the full report.
    reportStore.set({ status: 'success', data: reportData, error: null });
  } catch (err: any) {
    console.error("Report generation failed:", err);
    reportStore.set({ status: 'error', data: null, error: err.message });
  }
};

export const saveFeedback = async (
    rating: number,
    feedbackText: string,
    allowContact: boolean
) => {
    const currentUser = get(userStore);

    if (!currentUser) {
        throw new Error('You must be logged in to submit feedback.');
    }

    if (rating < 1 || rating > 5) {
        throw new Error('A rating between 1 and 5 is required.');
    }

    try {
        await addDoc(collection(db, 'feedback'), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            rating: rating,
            feedback: feedbackText.trim(), // Save trimmed text, or empty string if none
            allowContact: allowContact,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error writing feedback to Firestore: ', error);
        throw new Error('Could not save your feedback. Please try again later.');
    }
};