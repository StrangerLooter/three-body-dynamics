/**
 * Web Speech API text-to-speech helper with safe fallbacks.
 */

export function speakText(text) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Clean emojis and decorative symbols from speech output
    const clean = text.replace(/[🎙●▶⏸⏭⟲✓💥⭐🔬🌀💡🔍]/gu, '').trim();
    if (!clean) return;

    const utt = new window.SpeechSynthesisUtterance(clean);
    utt.rate = 0.95;
    utt.pitch = 1.05;
    utt.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const eng = voices.find((v) => v.lang.startsWith('en') && !v.name.includes('Google'));
    if (eng) utt.voice = eng;

    window.speechSynthesis.speak(utt);
  } catch (e) {
    // Speech synthesis unavailable or permission blocked
  }
}

export function stopSpeech() {
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {}
}
