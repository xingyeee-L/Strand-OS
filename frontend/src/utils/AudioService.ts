import { SFX_URLS } from '../assets/sounds';

class AudioService {
  private isInitialized: boolean = false;

  // 1. 初始化方法：必须在用户产生第一次交互（如点击、聚焦）时由前端触发
  public init() {
    if (this.isInitialized) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    this.isInitialized = true;
    console.log("🔊 [SC-7274] 战术音频链路已建立。");
  }

  // 2. 播放战术音效
  public playSFX(name: string, volume: number = 0.4) {
    const audio = new Audio(SFX_URLS[name] || `/sounds/${name}.mp3`);
    audio.volume = volume;
    audio.play().catch(() => {}); // 捕获未握手时的浏览器拦截
  }

  // 3. 战术语音播报 (TTS - 模拟无线电质感)
  public speak(text: string, onStart?: () => void, onEnd?: () => void) {
    if (!window.speechSynthesis || !text) return;

    // 强行停止之前的播报，防止重叠
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // 语种自动探测
    if (text.match(/[\u4e00-\u9fa5]/)) {
      utterance.lang = 'zh-CN';
    } else if (text.match(/[äöüß]/i)) {
      utterance.lang = 'de-DE';
    } else {
      utterance.lang = 'en-US';
    }

    // 🔥 战术调音
    utterance.rate = 1.15;
    utterance.pitch = 0.75;
    utterance.volume = 0.8;

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  public pauseSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }

  public resumeSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }
}

export const audioService = new AudioService();
