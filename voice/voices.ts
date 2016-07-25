import Rx = require("rx");

var voices = new Promise<SpeechSynthesisVoice[]>((resolve, reject) => {
  var start = Date.now();

  var timer = setInterval(() => {
    var voices = window.speechSynthesis.getVoices();

    if (voices.length > 0 || Date.now() - start > 5000) {
      clearInterval(timer);
      if (voices.length > 0) {
        resolve(voices);
      } else {
        reject(new Error("Could not resolve voices"));
      }
    }
  }, 1000);
});

export function speak(text:string, lang:string) {
  return new Promise<boolean>((resolve, reject) => {
    voices.then(voices => {
      var utterance = new SpeechSynthesisUtterance();
      var voice = voices.filter(v => v.lang === lang)[0];

      utterance.text = text;
      utterance.voice = voice;
      utterance.voiceURI = voice.voiceURI;

      if (/iPhone|iPad/.test(window.navigator.userAgent)) {
        utterance.rate = 0.5;
      }

      utterance.onend = () => resolve(false);
      utterance.onerror = (e) => reject(e);

      window.speechSynthesis.speak(utterance);
    }).then(null, ((e) => reject(e)));
  })
};
