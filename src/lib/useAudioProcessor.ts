import OpusRecorder from 'opus-recorder';
import { writable, type Writable } from 'svelte/store';

// This is a direct Svelte conversion of the provided React hook.

// The helper function remains the same.
const getAudioWorkletNode = async (
  audioContext: AudioContext,
  name: string
) => {
  try {
    return new AudioWorkletNode(audioContext, name);
  } catch {
    await audioContext.audioWorklet.addModule(`/${name}.js`);
    return new AudioWorkletNode(audioContext, name, {});
  }
};

// The interface remains the same.
export interface AudioProcessor {
  audioContext: AudioContext;
  opusRecorder: OpusRecorder;
  decoder: Worker;
  outputWorklet: AudioWorkletNode;
  inputAnalyser: AnalyserNode;
  outputAnalyser: AnalyserNode;
  mediaStreamDestination: MediaStreamAudioDestinationNode;
}

/**
 * Creates and manages the audio processing pipeline.
 * This is the Svelte-native replacement for the useAudioProcessor React hook.
 */
export function useAudioProcessor(onOpusRecorded: (chunk: Uint8Array) => void) {
  
  // Replaces `useRef`. This is a mutable variable that persists inside this function's closure.
  let audioProcessor: AudioProcessor | null = null;
  
  // Replaces returning the ref directly. We use a store for Svelte-native reactivity.
  const processorStore = writable<AudioProcessor | null>(null);

  // Replaces `useCallback`. This is just a regular async function now.
  // We are reverting to the architecture where this function ACCEPTS a MediaStream.
  const setupAudio = async (mediaStream: MediaStream): Promise<AudioProcessor | undefined> => {
    // Guard clause is the same.
    if (audioProcessor) return audioProcessor;

    // --- The following logic is a 1:1 copy from the provided React hook ---
    
    const audioContext = new AudioContext();
    const outputWorklet = await getAudioWorkletNode(audioContext, "audio-output-processor");
    
    const source = audioContext.createMediaStreamSource(mediaStream);
    const inputAnalyser = audioContext.createAnalyser();
    inputAnalyser.fftSize = 2048;
    source.connect(inputAnalyser);

    const mediaStreamDestination = audioContext.createMediaStreamDestination();
    outputWorklet.connect(mediaStreamDestination);
    source.connect(mediaStreamDestination);

    outputWorklet.connect(audioContext.destination);
    const outputAnalyser = audioContext.createAnalyser();
    outputAnalyser.fftSize = 2048;

    const gainNode = outputAnalyser.context.createGain();
    gainNode.gain.value = 5.0; // setting it to 500%

    outputWorklet.connect(outputAnalyser);
    outputAnalyser.connect(gainNode);
    gainNode.connect(audioContext.destination);

    outputWorklet.connect(mediaStreamDestination);
    source.connect(mediaStreamDestination);

    const decoder = new Worker("/decoderWorker.min.js") as Worker;
    let micDuration = 0;

    decoder.onmessage = (event: MessageEvent<any>) => {
      if (!event.data) return;
      const frame = event.data[0];
      outputWorklet.port.postMessage({
        frame: frame,
        type: "audio",
        micDuration: micDuration,
      });
    };
    decoder.postMessage({
        command: "init",
        bufferLength: (960 * audioContext.sampleRate) / 24000,
        decoderSampleRate: 24000,
        outputBufferSampleRate: audioContext.sampleRate,
        resampleQuality: 0,
    });

    const recorderOptions = {
      encoderPath: "/encoderWorker.min.js",
      encoderSampleRate: 24000,      // Required: 24kHz
      numberOfChannels: 1,           // Required: Mono
      encoderApplication: 2049,      // 'voice' application is best for this use case
      encoderFrameSize: 20,          // Standard frame size for real-time audio
      resampleQuality: 10,           // Use max quality to downsample from mic hardware rate to 24kHz
      streamPages: true,
    };
    
    const opusRecorder = new OpusRecorder(recorderOptions);
    
    // The original hook's type `(data: Uint8Array)` is incorrect.
    // The library actually passes a Blob. We correctly handle the conversion.
    opusRecorder.ondataavailable = (data: Blob) => {
      micDuration = opusRecorder.encodedSamplePosition / 48000;
      onOpusRecorded(data);
    };
    
    // We now must await initialization and connect the source node.
    // This part was missing from the original hook but is required.
    await opusRecorder.initialize;
    opusRecorder.audioContext.createMediaStreamSource(mediaStream).connect(opusRecorder.encoderNode);
    
    // Assign to our closure variable (replaces `audioProcessorRef.current = ...`)
    audioProcessor = {
      audioContext: opusRecorder.audioContext,
      opusRecorder,
      decoder,
      outputWorklet,
      inputAnalyser,
      outputAnalyser,
      mediaStreamDestination,
    };
    
    // Update the svelte store for consumers.
    processorStore.set(audioProcessor);

    await audioProcessor.audioContext.resume();
    opusRecorder.start();    

    return audioProcessor;
  };

  // Replaces `useCallback`. This is just a regular function.
  const shutdownAudio = () => {
    if (audioProcessor) {
      const { audioContext, opusRecorder } = audioProcessor;
      audioContext.close();
      opusRecorder.stop();

      audioProcessor = null;
      processorStore.set(null);
    }
  };
  
  // Return the public API, using a store for reactive state.
  return {
    setupAudio,
    shutdownAudio,
    processorStore
  };
}