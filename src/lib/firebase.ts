import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Check if Firebase should be disabled
const isFirebaseDisabled = import.meta.env.VITE_DISABLE_FIREBASE === 'true';

// Declare variables that can be null
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Export a boolean flag for other parts of the app to check
export const firebaseEnabled = !isFirebaseDisabled;

if (firebaseEnabled) {
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };

  // Basic validation to prevent crash on initializeApp
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    // This prevents re-initializing the app on hot reloads
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.warn("Firebase configuration is missing. Firebase features will be disabled.");
  }
}


export { app, auth, db };