import Rx = require("rx");

// var voices = new Promise<SpeechSynthesisVoice[]>((resolve, reject) => {

var voices = Rx.Observable.create<SpeechSynthesisVoice[]>(
  (observer:Rx.Observer<SpeechSynthesisVoice[]>) => {
    if (typeof window === "undefined") {
      observer.onCompleted();
      return;
    }

    var start = Date.now();

    var checkVoices = function () {
      var voices = window.speechSynthesis.getVoices();

      if (voices.length > 0 || Date.now() - start > 5000) {
        observer.onNext(voices);
        observer.onCompleted()
      }
    };

    var timer = setInterval(() => {
      checkVoices();
    }, 1000);

    checkVoices();

    return () => clearInterval(timer);
  });

export function speak(text:string, lang:string) {
  voices.subscribe((voices) => {
    window.speechSynthesis.cancel();

    var utterance = new SpeechSynthesisUtterance();
    var voice = voices.filter(v => v.lang === lang)[0];

    utterance.text = text;

    if (voice) {
      utterance.voice = voice;
      utterance.voiceURI = voice.voiceURI;
    } else {
      utterance.lang = lang;
    }

    window.speechSynthesis.speak(utterance);
  });
}

