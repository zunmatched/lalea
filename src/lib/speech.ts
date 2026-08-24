type SpeechPart = { text: string; lang: string; rate?: number };

let activeNoise: { context: AudioContext; source: AudioBufferSourceNode } | null = null;
let noiseSafetyTimeout: ReturnType<typeof setTimeout> | undefined;

function createNoiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function stopNoise() {
  if (noiseSafetyTimeout !== undefined) { clearTimeout(noiseSafetyTimeout); noiseSafetyTimeout = undefined }
  if (!activeNoise) return;
  try { activeNoise.source.stop() } catch { /* already stopped */ }
  activeNoise.context.close();
  activeNoise = null;
}

function startNoise() {
  stopNoise();
  const context = new AudioContext();
  const gain = context.createGain();
  gain.gain.value = 0.015;
  const source = context.createBufferSource();
  source.buffer = createNoiseBuffer(context);
  source.loop = true;
  source.connect(gain).connect(context.destination);
  source.start();
  activeNoise = { context, source };
  // safety net in case onend/onerror never fires for some reason
  noiseSafetyTimeout = setTimeout(stopNoise, 20_000);
}

export function speakSequence(parts: SpeechPart[], handlers?: { onEnd?: () => void; onError?: () => void }) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !parts.length) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  // Bluetooth outputs are often asleep between plays and need real, continuous PCM flowing to
  // wake the route. A discrete "primer" utterance before the real speech still leaves a gap at
  // the primer/real-speech boundary that can itself get clipped, so instead keep an inaudible
  // background noise floor running underneath the entire sequence, started before speech begins
  // and stopped only once the last utterance actually finishes.
  startNoise();
  // Chrome clips the first syllables of an utterance spoken immediately after cancel();
  // a short delay lets the engine finish resetting before the new utterance starts.
  setTimeout(() => {
    parts.forEach((part, index) => {
      const utterance = new SpeechSynthesisUtterance(part.text);
      utterance.lang = part.lang;
      if (part.rate) utterance.rate = part.rate;
      if (index === parts.length - 1) {
        utterance.onend = () => { stopNoise(); handlers?.onEnd?.() };
        utterance.onerror = () => { stopNoise(); handlers?.onError?.() };
      }
      synth.speak(utterance);
    });
  }, 80);
  return true;
}
