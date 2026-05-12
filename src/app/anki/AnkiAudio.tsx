"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, Btn, Card, SectionBadge } from "@/components/ui";
import {
  errorFromResponse,
  friendlyErrorMessage,
  isDatabaseUnavailableError,
} from "@/lib/api-error-message";
import type { AnkiCard, AnkiRating } from "./types";

interface CardsResponse {
  cards: AnkiCard[];
  total: number;
}

const AUDIO_RATINGS: { value: AnkiRating; label: string; spoken: string }[] = [
  { value: "AGAIN", label: "Again", spoken: "again" },
  { value: "HARD", label: "Hard", spoken: "hard" },
  { value: "GOOD", label: "Good", spoken: "good" },
  { value: "EASY", label: "Easy", spoken: "easy" },
];

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  length: number;
  item(index: number): SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  item(index: number): SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}

interface SpeechRecognitionConstructorLike {
  new(): SpeechRecognitionLike;
}

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
};

function dispatchToast(message: string) {
  window.dispatchEvent(new CustomEvent("servant:toast", { detail: { message } }));
}

function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function speechRecognitionConstructor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function AnkiAudio({ topicId }: { topicId?: string }) {
  const queryClient = useQueryClient();
  const [cardIndex, setCardIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [voiceRatings, setVoiceRatings] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const answerTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const supportsSpeech = speechSupported();
  const supportsVoiceRatings = speechRecognitionConstructor() !== null;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (topicId) params.set("topicId", topicId);
    params.set("dueOnly", "true");
    params.set("limit", "40");
    return params.toString();
  }, [topicId]);

  const { data, isLoading, isError, error, refetch } = useQuery<CardsResponse>({
    queryKey: ["anki-audio-cards", topicId],
    queryFn: async () => {
      const res = await fetch(`/api/anki/cards?${queryString}`);
      if (!res.ok) throw await errorFromResponse(res);
      return res.json() as Promise<CardsResponse>;
    },
    staleTime: 60_000,
  });

  const cards = useMemo(() => data?.cards ?? [], [data?.cards]);
  const currentCard = cards[cardIndex] ?? null;
  const progressPct = cards.length > 0 ? (cardIndex / cards.length) * 100 : 0;

  const clearAnswerTimer = useCallback(() => {
    if (answerTimerRef.current != null) {
      window.clearTimeout(answerTimerRef.current);
      answerTimerRef.current = null;
    }
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!supportsSpeech) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.96;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        onEnd?.();
      };
      window.speechSynthesis.speak(utterance);
    },
    [supportsSpeech],
  );

  const speakAnswer = useCallback((onEnd?: () => void) => {
    if (!currentCard) return;
    clearAnswerTimer();
    setAnswerVisible(true);
    speak(`Answer. ${currentCard.back}. ${currentCard.explanation ?? ""}`, onEnd);
  }, [clearAnswerTimer, currentCard, speak]);

  const speakQuestion = useCallback(() => {
    if (!currentCard) return;
    clearAnswerTimer();
    setAnswerVisible(false);
    speak(`Concept check. ${currentCard.front}`, () => {
      if (!handsFree) return;
      answerTimerRef.current = window.setTimeout(() => {
        speakAnswer(() => setVoiceStatus(voiceRatings ? "listening" : "ready"));
      }, 3500);
    });
  }, [clearAnswerTimer, currentCard, handsFree, speak, speakAnswer, voiceRatings]);

  const pauseAudio = useCallback(() => {
    clearAnswerTimer();
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setVoiceStatus(voiceRatings ? "listening" : "paused");
  }, [clearAnswerTimer, voiceRatings]);

  const handleRate = useCallback(
    async (rating: AnkiRating) => {
      if (!currentCard || submittingRating) return;
      clearAnswerTimer();
      setSubmittingRating(true);
      window.speechSynthesis?.cancel();
      try {
        const res = await fetch(`/api/anki/${currentCard.id}/review`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rating }),
        });
        if (!res.ok) throw await errorFromResponse(res);
        const nextIndex = cardIndex + 1;
        setCardIndex(nextIndex);
        setAnswerVisible(false);
        void queryClient.invalidateQueries({ queryKey: ["anki-due"] });
        void queryClient.invalidateQueries({ queryKey: ["anki-badge"] });
        void queryClient.invalidateQueries({ queryKey: ["anki-stats"] });
        if (!handsFree && autoPlay && cards[nextIndex]) {
          window.setTimeout(() => speak(`Next concept. ${cards[nextIndex]?.front ?? ""}`), 500);
        }
      } catch (err) {
        dispatchToast(friendlyErrorMessage(err, "Failed to submit audio review"));
      } finally {
        setSubmittingRating(false);
      }
    },
    [autoPlay, cardIndex, cards, clearAnswerTimer, currentCard, handsFree, queryClient, speak, submittingRating],
  );

  const handleVoiceCommand = useCallback((rawTranscript: string) => {
    const transcript = rawTranscript.toLowerCase();
    if (transcript.includes("repeat") || transcript.includes("again please")) {
      setVoiceStatus("repeat");
      speakQuestion();
      return;
    }
    if (transcript.includes("answer") || transcript.includes("show")) {
      setVoiceStatus("answer");
      speakAnswer(() => setVoiceStatus("listening"));
      return;
    }
    const words = transcript.split(/[^a-z]+/).filter(Boolean);
    const rating = AUDIO_RATINGS.find((item) => words.includes(item.spoken));
    if (rating) {
      setVoiceStatus(`heard ${rating.spoken}`);
      void handleRate(rating.value);
      return;
    }
    if (transcript.includes("pause")) {
      pauseAudio();
      return;
    }
    if (transcript.includes("stop")) {
      setHandsFree(false);
      setVoiceRatings(false);
      pauseAudio();
    }
  }, [handleRate, pauseAudio, speakAnswer, speakQuestion]);

  useEffect(() => {
    return () => {
      clearAnswerTimer();
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
    };
  }, [clearAnswerTimer]);

  useEffect(() => {
    if (!handsFree || !currentCard) return;
    setVoiceStatus(voiceRatings ? "listening" : "ready");
    const id = window.setTimeout(() => speakQuestion(), 350);
    return () => window.clearTimeout(id);
  }, [currentCard, handsFree, speakQuestion, voiceRatings]);

  useEffect(() => {
    if (!voiceRatings) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setVoiceStatus(handsFree ? "ready" : "idle");
      return;
    }

    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setVoiceStatus("unavailable");
      setVoiceRatings(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results.item(i);
        if (result.length > 0) transcript += ` ${result.item(0).transcript}`;
      }
      handleVoiceCommand(transcript.trim());
    };
    recognition.onerror = () => setVoiceStatus("voice error");
    recognition.onend = () => {
      if (!voiceRatings) return;
      try {
        recognition.start();
        setVoiceStatus("listening");
      } catch {
        setVoiceStatus("voice paused");
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setVoiceStatus("listening");
    } catch {
      setVoiceStatus("voice paused");
    }

    return () => {
      recognition.onend = null;
      recognition.stop();
    };
  }, [handleVoiceCommand, handsFree, voiceRatings]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (event.key === " ") {
        event.preventDefault();
        if (answerVisible) speakQuestion();
        else speakAnswer();
      }
      const rating = AUDIO_RATINGS[Number(event.key) - 1]?.value;
      if (rating) void handleRate(rating);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [answerVisible, handleRate, speakAnswer, speakQuestion]);

  const toggleHandsFree = useCallback(() => {
    setHandsFree((value) => {
      const next = !value;
      if (next) setAutoPlay(true);
      return next;
    });
  }, []);

  const toggleVoiceRatings = useCallback(() => {
    if (!supportsVoiceRatings) {
      dispatchToast("Voice ratings are not available in this browser.");
      return;
    }
    setVoiceRatings((value) => !value);
  }, [supportsVoiceRatings]);

  if (isLoading) {
    return (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Audio review</p>
            <h2 className="mt-1 text-lg font-semibold text-[color:var(--ink)]">Concept quiz</h2>
          </div>
          <div className="h-2 w-32 overflow-hidden rounded bg-[color:var(--surface-2)]">
            <div className="h-full w-1/2 animate-pulse rounded bg-[color:var(--accent-faint)]" />
          </div>
        </div>
        <p className="mt-4 text-sm text-[color:var(--ink-faint)]">Loading audio deck...</p>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <div className="text-center" role="alert">
          <p className="text-sm font-medium text-[color:var(--bad)]">
            {isDatabaseUnavailableError(error) ? "Database offline" : "Audio deck could not be loaded"}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-[color:var(--ink-faint)]">
            {friendlyErrorMessage(error, "Audio deck could not be loaded.")}
          </p>
          <Btn size="sm" variant="ghost" className="mt-4" onClick={() => void refetch()}>
            Retry
          </Btn>
        </div>
      </Card>
    );
  }

  if (!currentCard) {
    return (
      <Card>
        <p className="text-sm font-medium text-[color:var(--ink)]">Audio review is clear.</p>
        <p className="mt-1 text-sm text-[color:var(--ink-dim)]">
          Generate coverage-based cards from indexed textbook topics, then come back for concept review.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Audio review</p>
            <h2 className="mt-1 text-lg font-semibold text-[color:var(--ink)]">Concept quiz</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAutoPlay((value) => !value)}
              className="min-h-11 rounded border border-[color:var(--border)] px-3 text-sm text-[color:var(--ink-dim)] hov"
            >
              Auto-play {autoPlay ? "on" : "off"}
            </button>
            <button
              type="button"
              onClick={toggleHandsFree}
              className="min-h-11 rounded border border-[color:var(--border)] px-3 text-sm text-[color:var(--ink-dim)] hov"
            >
              Hands-free {handsFree ? "on" : "off"}
            </button>
            <button
              type="button"
              onClick={toggleVoiceRatings}
              className="min-h-11 rounded border border-[color:var(--border)] px-3 text-sm text-[color:var(--ink-dim)] hov disabled:opacity-60"
              disabled={!supportsVoiceRatings}
            >
              Voice ratings {voiceRatings ? "on" : "off"}
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <Bar pct={progressPct} aria-label={`Audio review progress ${Math.round(progressPct)}%`} />
          </div>
          <span className="font-mono text-xs text-[color:var(--ink-faint)]">
            {Math.min(cardIndex + 1, cards.length)} / {cards.length}
          </span>
        </div>
      </Card>

      <div className="audio-control-stack">
        <div className="grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => speakQuestion()} className="mobile-action-button">
            Play concept
          </button>
          <button type="button" onClick={() => speakAnswer()} className="mobile-action-button mobile-action-primary">
            Hear answer
          </button>
          <button
            type="button"
            onClick={pauseAudio}
            className="mobile-action-button"
          >
            Pause
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Rate audio flashcard">
          {AUDIO_RATINGS.map((rating, index) => (
            <button
              key={rating.value}
              type="button"
              disabled={submittingRating || !answerVisible}
              onClick={() => void handleRate(rating.value)}
              className="mobile-action-button"
              aria-label={`${rating.label} ${index + 1}`}
              title={!answerVisible ? "Hear the answer before rating this card." : undefined}
            >
              {rating.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="audio-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {currentCard.section && <SectionBadge section={currentCard.section} size="xs" />}
            {currentCard.sourceCitation && (
              <span className="font-mono text-[11px] text-[color:var(--ink-faint)]">{currentCard.sourceCitation}</span>
            )}
          </div>
          <span className="text-xs text-[color:var(--ink-faint)]">
            {speaking ? "Speaking..." : handsFree ? `Hands-free ${voiceStatus}` : "Ready"}
          </span>
        </div>

        <p className="mt-5 text-xl font-semibold leading-snug text-[color:var(--ink)]">{currentCard.front}</p>

        {answerVisible && (
          <div className="mt-5 border-l-2 border-[color:var(--accent)] pl-4">
            <p className="eyebrow mb-2">Answer</p>
            <p className="text-sm leading-relaxed text-[color:var(--ink)] sm:text-base">{currentCard.back}</p>
            {currentCard.explanation && (
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--ink-dim)]">{currentCard.explanation}</p>
            )}
          </div>
        )}

        {!supportsSpeech && (
          <p className="mt-4 rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--ink-dim)]">
            This browser cannot expose speech synthesis. The large controls still let you review and count progress.
          </p>
        )}
      </Card>
    </div>
  );
}
