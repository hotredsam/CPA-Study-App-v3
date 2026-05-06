"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

function dispatchToast(message: string) {
  window.dispatchEvent(new CustomEvent("servant:toast", { detail: { message } }));
}

function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function AnkiAudio({ topicId }: { topicId?: string }) {
  const queryClient = useQueryClient();
  const [cardIndex, setCardIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const supportsSpeech = speechSupported();

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (topicId) params.set("topicId", topicId);
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

  const speak = useCallback(
    (text: string) => {
      if (!supportsSpeech) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.96;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [supportsSpeech],
  );

  const speakQuestion = useCallback(() => {
    if (!currentCard) return;
    setAnswerVisible(false);
    speak(`Concept check. ${currentCard.front}`);
  }, [currentCard, speak]);

  const speakAnswer = useCallback(() => {
    if (!currentCard) return;
    setAnswerVisible(true);
    speak(`Answer. ${currentCard.back}. ${currentCard.explanation ?? ""}`);
  }, [currentCard, speak]);

  const handleRate = useCallback(
    async (rating: AnkiRating) => {
      if (!currentCard || submittingRating) return;
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
        if (autoPlay && cards[nextIndex]) {
          window.setTimeout(() => speak(`Next concept. ${cards[nextIndex]?.front ?? ""}`), 500);
        }
      } catch (err) {
        dispatchToast(friendlyErrorMessage(err, "Failed to submit audio review"));
      } finally {
        setSubmittingRating(false);
      }
    },
    [autoPlay, cardIndex, cards, currentCard, queryClient, speak, submittingRating],
  );

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

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

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-[color:var(--ink-faint)]">Loading audio deck...</div>;
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
          <button
            type="button"
            onClick={() => setAutoPlay((value) => !value)}
            className="min-h-11 rounded border border-[color:var(--border)] px-3 text-sm text-[color:var(--ink-dim)] hov"
          >
            Auto-play {autoPlay ? "on" : "off"}
          </button>
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

      <Card className="audio-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {currentCard.section && <SectionBadge section={currentCard.section} size="xs" />}
            {currentCard.sourceCitation && (
              <span className="font-mono text-[11px] text-[color:var(--ink-faint)]">{currentCard.sourceCitation}</span>
            )}
          </div>
          <span className="text-xs text-[color:var(--ink-faint)]">{speaking ? "Speaking..." : "Ready"}</span>
        </div>

        <p className="mt-5 text-xl font-semibold leading-snug text-[color:var(--ink)]">{currentCard.front}</p>

        {answerVisible && (
          <div className="mt-5 border-l-2 border-[color:var(--accent)] pl-4">
            <p className="eyebrow mb-2">Answer</p>
            <p className="text-base leading-relaxed text-[color:var(--ink)]">{currentCard.back}</p>
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

      <div className="grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={speakQuestion} className="mobile-action-button">
          Play concept
        </button>
        <button type="button" onClick={speakAnswer} className="mobile-action-button mobile-action-primary">
          Hear answer
        </button>
        <button
          type="button"
          onClick={() => window.speechSynthesis?.cancel()}
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
            disabled={submittingRating}
            onClick={() => void handleRate(rating.value)}
            className="mobile-action-button"
            aria-label={`${rating.label} ${index + 1}`}
          >
            {rating.label}
          </button>
        ))}
      </div>
    </div>
  );
}
