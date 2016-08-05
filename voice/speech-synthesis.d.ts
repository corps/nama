interface SpeechSynthesisVoice {
  default:boolean;
  localService:boolean;
  lang:string;
  name:string;
  voiceURI:string;
}

interface SpeechSynthesisEvent extends Event {
  charIndex:number;
  elapsedTime:number;
  name:string;
}

interface SpeechEventHandler {
  (evt:SpeechSynthesisEvent):void
}

declare class SpeechSynthesisUtterance {
  constructor();
  text:string;
  volume:number;
  rate:number;
  pitch:number;
  lang:string;
  voiceURI:string;
  voice:SpeechSynthesisVoice;

  onstart:SpeechEventHandler;
  onend:SpeechEventHandler;
  onerror:SpeechEventHandler;
  onpause:SpeechEventHandler;
  onresume:SpeechEventHandler;
  onmark:SpeechEventHandler;
  onboundary:SpeechEventHandler;
}

interface SpeechSynthesisStaticApi {
  getVoices():SpeechSynthesisVoice[]
  speak(utterance:SpeechSynthesisUtterance):void
  cancel():void
}

interface Window {
  speechSynthesis:SpeechSynthesisStaticApi
}
