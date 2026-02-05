// OpenAI TTS via server proxy.
// Server endpoint: POST /api/tts -> returns audio/mpeg
//
// The server uses OpenAI Audio API: https://api.openai.com/v1/audio/speech
// Docs: https://platform.openai.com/docs/guides/text-to-speech

export async function speakWithOpenAI({ text, voice="marin", instructions="" }){
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ text, voice, instructions })
  });
  if(!res.ok){
    const msg = await res.text().catch(()=> "");
    throw new Error(`TTS failed: ${res.status} ${msg}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
  // revoke later
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once:true });
}

// Browser fallback: SpeechSynthesis (attempt en-GB female if available)
export function speakWithBrowser(text){
  if(!("speechSynthesis" in window)) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
  const voices = speechSynthesis.getVoices?.() || [];
  const gb = voices.find(v => /en-GB/i.test(v.lang) && /female|fiona|kate|victoria|serena/i.test(v.name));
  const anyGB = voices.find(v => /en-GB/i.test(v.lang));
  if(gb) u.voice = gb;
  else if(anyGB) u.voice = anyGB;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return true;
}
