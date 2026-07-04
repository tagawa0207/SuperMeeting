"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptSegment } from "@/lib/types";
import {
  SpeechController,
  isSpeechRecognitionSupported,
} from "@/lib/stt/webSpeech";
import { formatTranscriptForAI } from "@/lib/transcript";

let segmentCounter = 0;

export interface UseTranscription {
  supported: boolean;
  listening: boolean;
  segments: TranscriptSegment[];
  interim: string;
  /** 暫定発話の話者（拡張からの interim 用）。 */
  interimSpeaker: string | null;
  error: string | null;
  /** 手動モードでの現在の話者。null なら未指定。 */
  currentSpeaker: string | null;
  /** 認識言語（例: ja-JP / en-US）。 */
  lang: string;
  /** 話者ラベル付きの全文（AI 分析の入力）。 */
  fullText: string;
  setLang: (lang: string) => void;
  setCurrentSpeaker: (name: string | null) => void;
  start: () => void;
  stop: () => void;
  clear: () => void;
  /** 手入力で発話を追加する（現在の話者を付与）。 */
  addManual: (text: string) => void;
  /** 外部（Chrome 拡張）から話者付き発話を取り込む。 */
  ingestSegment: (text: string, speaker: string, at?: number) => void;
  /** 外部からの暫定発話を反映する。 */
  ingestInterim: (text: string, speaker: string) => void;
}

export function useTranscription(): UseTranscription {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interim, setInterim] = useState("");
  const [interimSpeaker, setInterimSpeaker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [lang, setLang] = useState("ja-JP");
  const controllerRef = useRef<SpeechController | null>(null);
  // 最新の値を音声認識コールバック / start から参照するための ref。
  const currentSpeakerRef = useRef<string | null>(null);
  currentSpeakerRef.current = currentSpeaker;
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  const appendSegment = useCallback(
    (text: string, speaker: string | null, at = Date.now()) => {
      if (!text) return;
      setSegments((prev) => [
        ...prev,
        {
          id: `seg-${++segmentCounter}`,
          text,
          at,
          speaker: speaker || undefined,
        },
      ]);
    },
    [],
  );

  const start = useCallback(() => {
    setError(null);
    const controller = new SpeechController({
      onFinal: (text) => {
        appendSegment(text, currentSpeakerRef.current);
        setInterim("");
      },
      onInterim: (text) => setInterim(text),
      onError: (message) => setError(message),
      onEnd: () => setListening(false),
    }, langRef.current);
    controllerRef.current = controller;
    controller.start();
    setListening(true);
  }, [appendSegment]);

  const stop = useCallback(() => {
    controllerRef.current?.stop();
    controllerRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

  const clear = useCallback(() => {
    setSegments([]);
    setInterim("");
    setInterimSpeaker(null);
  }, []);

  const addManual = useCallback(
    (text: string) => appendSegment(text.trim(), currentSpeakerRef.current),
    [appendSegment],
  );

  const ingestSegment = useCallback(
    (text: string, speaker: string, at?: number) => {
      appendSegment(text.trim(), speaker, at);
      setInterim("");
      setInterimSpeaker(null);
    },
    [appendSegment],
  );

  const ingestInterim = useCallback((text: string, speaker: string) => {
    setInterim(text);
    setInterimSpeaker(speaker || null);
  }, []);

  useEffect(() => {
    return () => controllerRef.current?.stop();
  }, []);

  const fullText = formatTranscriptForAI(segments);

  return {
    supported,
    listening,
    segments,
    interim,
    interimSpeaker,
    error,
    currentSpeaker,
    lang,
    fullText,
    setLang,
    setCurrentSpeaker,
    start,
    stop,
    clear,
    addManual,
    ingestSegment,
    ingestInterim,
  };
}
