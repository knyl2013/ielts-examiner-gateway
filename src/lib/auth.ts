// src/lib/auth.ts (example file)
import { db } from '$lib/firebase';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import type { ReportData } from '$lib/stores';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '$lib/firebase';

/**
 * Migrates reports from localStorage to the user's Firestore account.
 * This should be called once, right after a user logs in.
 * @param userId The UID of the newly logged-in user.
 */
export const migrateLocalReportsToFirebase = async (userId: string) => {
  const localReportsRaw = localStorage.getItem('reportHistory');
  if (!localReportsRaw) {
    console.log('No local reports to migrate.');
    return;
  }

  try {
    const localReports: ReportData[] = JSON.parse(localReportsRaw);
    if (localReports.length === 0) {
      return;
    }

    // Use a batch write for efficiency. This treats all the writes as a single operation.
    const batch = writeBatch(db);
    const reportsCollection = collection(db, 'reports');

    localReports.forEach(report => {
      // Create a new document reference for each report
      const newReportRef = doc(reportsCollection); // `doc` needs to be imported from 'firebase/firestore'
      batch.set(newReportRef, {
        ...report,
        userId: userId, // Link to the current user
        date: new Date(report.date), // Ensure date is a Firestore Timestamp
      });
    });

    await batch.commit();
    console.log(`Successfully migrated ${localReports.length} reports to Firestore.`);

    // **IMPORTANT**: Clear the local storage after successful migration
    localStorage.removeItem('reportHistory');

  } catch (error) {
    console.error("Failed to migrate local reports:", error);
    // Decide if you want to leave the local data for a retry or inform the user.
  }
};

export const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        console.log("Successfully signed in with Google:", result.user.displayName);
        // After successful sign-in, run the migration
        await migrateLocalReportsToFirebase(result.user.uid);
    } catch (error) {
        console.error("Google Sign-In failed:", error);
        // Handle errors here (e.g., popup closed by user)
    }
};

export const signOutUser = async () => {
    try {
        await signOut(auth);
        console.log("User signed out.");
    } catch (error) {
        console.error("Sign-out failed:", error);
    }
};