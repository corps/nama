import Rx = require("rx");

var voices = new Promise<SpeechSynthesisVoice[]>((resolve, reject) => {
  if (typeof window === "undefined") return resolve([]);

  var start = Date.now();

  var timer = setInterval(() => {
    var voices = window.speechSynthesis.getVoices();

    if (voices.length > 0 || Date.now() - start > 5000) {
      clearInterval(timer);
      resolve(voices);
    }
  }, 1000);
});

export function speak(text:string, lang:string) {
  return new Promise<boolean>((resolve, reject) => {
    voices.then(voices => {
      var utterance = new SpeechSynthesisUtterance();
      var voice = voices.filter(v => v.lang === lang)[0];

      utterance.text = text;

      if (voice) {
        utterance.voice = voice;
        utterance.voiceURI = voice.voiceURI;
      } else {
        utterance.lang = lang;
      }

      if (/iPhone|iPad/.test(window.navigator.userAgent)) {
        utterance.rate = 0.5;
      }

      utterance.onend = () => resolve(false);
      utterance.onerror = (e) => reject(e);

      window.speechSynthesis.speak(utterance);
    }).then(null, ((e) => reject(e)));
  })
};
