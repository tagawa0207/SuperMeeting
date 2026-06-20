"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptSegment } from "@/lib/types";
import {
  SpeechController,
  isSpeechRecognitionSupported,
} from "@/lib/stt/webSpeech";

let segmentCounter = 0;

export interface UseTranscription {
  supported: boolean;
  listening: boolean;
  segments: TranscriptSegment[];
  interim: string;
  error: string | null;
  /** 全確定発話を連結したテキスト（AI 分析の入力に使う）。 */
  fullText: string;
  start: () => void;
  stop: () => void;
  clear: () => void;
  /** デモ用に手入力で発話を追加する。 */
  addManual: (text: string) => void;
}

export function useTranscription(): UseTranscription {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<SpeechController | null>(null);

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  const appendFinal = useCallback((text: string) => {
    if (!text) return;
    setSegments((prev) => [
      ...prev,
      { id: `seg-${++segmentCounter}`, text, at: Date.now() },
    ]);
  }, []);

  const start = useCallback(() => {
    setError(null);
    const controller = new SpeechController({
      onFinal: (text) => {
        appendFinal(text);
        setInterim("");
      },
      onInterim: (text) => setInterim(text),
      onError: (message) => setError(message),
      onEnd: () => setListening(false),
    });
    controllerRef.current = controller;
    controller.start();
    setListening(true);
  }, [appendFinal]);

  const stop = useCallback(() => {
    controllerRef.current?.stop();
    controllerRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

  const clear = useCallback(() => {
    setSegments([]);
    setInterim("");
  }, []);

  const addManual = useCallback(
    (text: string) => appendFinal(text.trim()),
    [appendFinal],
  );

  useEffect(() => {
    return () => controllerRef.current?.stop();
  }, []);

  const fullText = segments.map((s) => s.text).join("\n");

  return {
    supported,
    listening,
    segments,
    interim,
    error,
    fullText,
    start,
    stop,
    clear,
    addManual,
  };
}
