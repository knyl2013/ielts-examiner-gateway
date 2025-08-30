// src/lib/config.ts

// --- TYPE DEFINITIONS ---
export type LanguageCode = "en" | "fr" | "en/fr" | "fr/en";

export type ConstantInstructions = {
  type: "constant";
  text: string;
  language?: LanguageCode;
};

export type Instructions =
  | ConstantInstructions
  | { type: "smalltalk"; language?: LanguageCode }
  | { type: "guess_animal"; language?: LanguageCode }
  | { type: "quiz_show"; language?: LanguageCode };

export type UnmuteConfig = {
  instructions: Instructions;
  voice: string;
  // The backend doesn't care about this, we use it for analytics
  voiceName: string;
  // The backend doesn't care about this, we use it for analytics
  isCustomInstructions: boolean;
};

export type FreesoundVoiceSource = {
  source_type: "freesound";
  url: string;
  start_time: number;
  sound_instance: { id: number; name: string; username: string; license: string; };
  path_on_server: string;
};

export type FileVoiceSource = {
  source_type: "file";
  path_on_server: string;
  description?: string;
  description_link?: string;
};

export type VoiceSample = {
  name: string | null;
  comment: string;
  good: boolean;
  instructions: Instructions | null;
  source: FreesoundVoiceSource | FileVoiceSource;
};


// --- CONSTANTS ---
export const DEFAULT_UNMUTE_CONFIG: UnmuteConfig = {
  instructions: { type: "smalltalk", language: "en" },
  voice: "unmute-prod-website/developer-1.mp3",
  voiceName: "Explanation",
  isCustomInstructions: false,
};


// --- UTILITY FUNCTIONS ---
export const instructionsToPlaceholder = (instructions: Instructions): string => {
  if (instructions.type === "constant") {
    return instructions.text;
  }
  return {
    smalltalk: "Make pleasant conversation...",
    guess_animal: "Make the user guess the animal...",
    quiz_show: "You're a quiz show host that hates his job...",
  }[instructions.type] || "";
};

export const fetchVoices = async (backendServerUrl: string): Promise<VoiceSample[]> => {
  try {
    const response = await fetch(`${backendServerUrl}/v1/voices`);
    if (!response.ok) {
      console.error("Failed to fetch voices:", response.statusText);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching voices:", error);
    return [];
  }
};

export const getVoiceName = (voice: VoiceSample): string => {
  return (
    voice.name ||
    (voice.source.source_type === "freesound"
      ? voice.source.sound_instance.username
      : voice.source.path_on_server.slice(0, 10))
  );
};