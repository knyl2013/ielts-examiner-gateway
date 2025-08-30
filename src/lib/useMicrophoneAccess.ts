// src/lib/useMicrophoneAccess.ts
import { writable } from 'svelte/store';

// A Svelte store to hold the permission status.
// The '$' prefix in the template ($microphoneAccessStatus) automatically subscribes to it.
export const microphoneAccessStatus = writable<'prompt' | 'granted' | 'denied'>('prompt');

export function useMicrophoneAccess() {
  const askMicrophoneAccess = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneAccessStatus.set('granted');
      return stream;
    } catch (err) {
      console.error("Error asking for microphone access:", err);
      microphoneAccessStatus.set('denied');
      return null;
    }
  };

  return { askMicrophoneAccess, microphoneAccessStatus };
}