// Web Speech API のラッパー。ブラウザ標準の音声認識を扱いやすくする。
// 将来 Whisper 等のクラウド STT に差し替えられるよう、最小限のインターフェースに揃える。
import type {
  SpeechRecognition,
  SpeechRecognitionConstructor,
} from "./types";

export interface TranscriptionCallbacks {
  /** 確定したテキスト。 */
  onFinal: (text: string) => void;
  /** 暫定（認識途中）テキスト。 */
  onInterim: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getConstructor() !== null;
}

/**
 * 音声認識コントローラ。start/stop で制御する。
 * continuous なセッション中にブラウザが自動停止しても、
 * stopRequested でなければ自動再開する。
 */
export class SpeechController {
  private recognition: SpeechRecognition | null = null;
  private stopRequested = false;
  private callbacks: TranscriptionCallbacks;
  private lang: string;

  constructor(callbacks: TranscriptionCallbacks, lang = "ja-JP") {
    this.callbacks = callbacks;
    this.lang = lang;
  }

  start(): void {
    const Ctor = getConstructor();
    if (!Ctor) {
      this.callbacks.onError(
        "このブラウザは音声認識に対応していません（Chrome を推奨）",
      );
      return;
    }
    this.stopRequested = false;
    const recognition = new Ctor();
    recognition.lang = this.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          this.callbacks.onFinal(text.trim());
        } else {
          interim += text;
        }
      }
      this.callbacks.onInterim(interim);
    };

    recognition.onerror = (event) => {
      // no-speech / aborted は致命的でないため通知のみ。
      if (event.error !== "no-speech" && event.error !== "aborted") {
        this.callbacks.onError(`音声認識エラー: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // ユーザーが止めていなければ自動再開（長時間の会議に対応）。
      if (!this.stopRequested) {
        try {
          recognition.start();
        } catch {
          this.callbacks.onEnd();
        }
      } else {
        this.callbacks.onEnd();
      }
    };

    this.recognition = recognition;
    recognition.start();
  }

  stop(): void {
    this.stopRequested = true;
    this.recognition?.stop();
    this.recognition = null;
  }
}
