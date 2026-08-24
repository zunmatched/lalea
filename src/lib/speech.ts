type SpeechPart = { text: string; lang: string; rate?: number };

export function speakSequence(parts: SpeechPart[], handlers?: { onEnd?: () => void; onError?: () => void }) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !parts.length) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  // Chrome clips the first syllables of an utterance spoken immediately after cancel();
  // a short delay lets the engine finish resetting before the new utterance starts.
  setTimeout(() => {
    // Bluetooth outputs are often asleep between plays and need real PCM flowing to wake the
    // route; this near-silent primer absorbs that wake-up latency instead of the first word.
    const primer = new SpeechSynthesisUtterance(".");
    primer.volume = 0.01;
    primer.lang = parts[0].lang;
    synth.speak(primer);

    parts.forEach((part, index) => {
      const utterance = new SpeechSynthesisUtterance(part.text);
      utterance.lang = part.lang;
      if (part.rate) utterance.rate = part.rate;
      if (index === parts.length - 1) {
        if (handlers?.onEnd) utterance.onend = handlers.onEnd;
        if (handlers?.onError) utterance.onerror = handlers.onError;
      }
      synth.speak(utterance);
    });
  }, 80);
  return true;
}
