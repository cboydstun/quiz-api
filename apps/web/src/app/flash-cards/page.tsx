"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useLazyQuery, useQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Alert,
  Button,
  FlipCard,
  Label,
  Panel,
  Readout,
  Rule,
  Spinner,
  Status,
} from "@/components/ds";

const GET_QUESTION_IDS: TypedDocumentNode<
  GetQuestionIdsResult,
  GetQuestionIdsVars
> = gql`
  query GetQuestionIds($domain: String) {
    questions(domain: $domain) {
      id
    }
  }
`;

const GET_QUESTION_DOMAINS: TypedDocumentNode<GetQuestionDomainsResult> = gql`
  query GetQuestionDomains {
    questionDomains
  }
`;

const GET_QUESTION: TypedDocumentNode<GetQuestionResult, GetQuestionVars> = gql`
  query GetQuestion($id: ID!) {
    question(id: $id) {
      id
      prompt
      questionText
      answers
      correctAnswer
      domain
      createdBy {
        id
        username
      }
    }
  }
`;

interface FlashCard {
  id: string;
  prompt: string;
  questionText: string;
  answers: string[];
  correctAnswer: string | null;
  domain: string | null;
}

interface GetQuestionIdsResult {
  questions: { id: string }[] | null;
}
interface GetQuestionIdsVars {
  domain?: string | null;
}

interface GetQuestionDomainsResult {
  questionDomains: string[] | null;
}

interface GetQuestionResult {
  question: FlashCard | null;
}
interface GetQuestionVars {
  id: string;
}

const ALL = "All";

/**
 * The answer face. "All of the above" is expanded into the answers it stands
 * for, because a card reading "all of the above" teaches nothing on its own.
 */
function cardBack(card: FlashCard): string[] {
  if (!card.correctAnswer) return ["No answer recorded"];
  if (card.correctAnswer.toLowerCase() === "all of the above") {
    return card.answers.filter(
      (answer) => answer.toLowerCase() !== "all of the above",
    );
  }
  return [card.correctAnswer];
}

export default function FlashCardsPage() {
  const [domain, setDomain] = useState<string>(ALL);
  const [queue, setQueue] = useState<string[]>([]);
  const [cards, setCards] = useState<Record<string, FlashCard>>({});
  const [known, setKnown] = useState<string[]>([]);
  const [again, setAgain] = useState<string[]>([]);
  const [seen, setSeen] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const {
    loading: idsLoading,
    error: idsError,
    data: idsData,
  } = useQuery(GET_QUESTION_IDS, {
    variables: { domain: domain === ALL ? null : domain },
  });
  const { data: domainsData } = useQuery(GET_QUESTION_DOMAINS);
  const [getQuestion, { error: questionError }] = useLazyQuery(GET_QUESTION);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const questionIds = useMemo(
    () => idsData?.questions?.map((q) => q.id) ?? [],
    [idsData],
  );

  // A new id set — a different domain, or the first load — restarts the deck.
  useEffect(() => {
    setQueue(questionIds);
    setKnown([]);
    setAgain([]);
    setSeen(0);
    setIsFlipped(false);
  }, [questionIds]);

  const currentId = queue[0];
  const card = currentId ? cards[currentId] : undefined;

  // Cards are fetched one at a time as they reach the front of the queue, and
  // cached by id so a requeued card is never re-fetched.
  useEffect(() => {
    if (!currentId || cards[currentId]) return;
    getQuestion({ variables: { id: currentId } })
      .then(({ data }) => {
        const question = data?.question;
        if (question) {
          setCards((prev) => ({ ...prev, [question.id]: question }));
        }
      })
      .catch((err) => console.error("Error fetching question:", err));
  }, [currentId, cards, getQuestion]);

  const advance = useCallback(
    (verdict: "known" | "again") => {
      if (!currentId) return;
      setSeen((s) => s + 1);
      setIsFlipped(false);

      if (verdict === "known") {
        setKnown((k) => (k.includes(currentId) ? k : [...k, currentId]));
        setQueue((q) => q.filter((id) => id !== currentId));
      } else {
        setAgain((a) => (a.includes(currentId) ? a : [...a, currentId]));
        setQueue((q) => [...q.filter((id) => id !== currentId), currentId]);
      }
    },
    [currentId],
  );

  const restart = useCallback(() => {
    setQueue(questionIds);
    setKnown([]);
    setAgain([]);
    setSeen(0);
    setIsFlipped(false);
  }, [questionIds]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Buttons are skipped too: the card face is itself a button, so Space
      // would otherwise both click it and run this handler.
      if (
        target &&
        (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === "1" || e.key === "ArrowLeft") {
        e.preventDefault();
        advance("again");
      } else if (e.key === "2" || e.key === "ArrowRight") {
        e.preventDefault();
        advance("known");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance]);

  if (authLoading || idsLoading) return <Spinner label="Loading deck" />;
  if (!user) return null;

  const error = idsError ?? questionError;
  if (error) {
    return (
      <div className="mx-auto max-w-mid px-8 py-16">
        <Alert tone="abort">{error.message}</Alert>
      </div>
    );
  }

  const total = questionIds.length;
  const mastered = known.length;
  const pct = total ? Math.round((mastered / total) * 100) : 0;
  const domains = [ALL, ...(domainsData?.questionDomains ?? [])];

  return (
    <div className="mx-auto max-w-mid px-8 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Label tag="///" className="mb-4">
            Recall Drill
          </Label>
          <h1 className="m-0 text-2xl font-medium tracking-tight text-bone-100">
            Flash cards
          </h1>
        </div>
        {domains.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <Button
                key={d}
                variant="outline"
                size="sm"
                selected={domain === d}
                onClick={() => setDomain(d)}
              >
                {d}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-px border border-line-hairline bg-line-hairline lg:grid-cols-4">
        <div className="bg-ink-800">
          <Readout
            label="Mastered"
            value={mastered}
            unit={`/ ${total}`}
            tone={total > 0 && mastered === total ? "go" : "primary"}
          />
        </div>
        <div className="bg-ink-800">
          <Readout
            label="Requeued"
            value={again.length}
            tone={again.length ? "caution" : "primary"}
          />
        </div>
        <div className="bg-ink-800">
          <Readout label="Reviewed" value={seen} />
        </div>
        <div className="bg-ink-800">
          <Readout label="Progress" value={pct} unit="%" tone="signal" />
        </div>
      </div>

      <div className="mb-8 h-0.5 bg-ink-950">
        <div
          className="h-0.5 bg-signal transition-[width] duration-[var(--duration-base)] ease-default"
          style={{ width: `${pct}%` }}
        />
      </div>

      {total === 0 ? (
        <Panel label="Empty Deck" tag="///" meta={domain} padding="lg">
          <p className="m-0 text-sm text-mute-500">
            No questions in this domain yet.
          </p>
        </Panel>
      ) : !currentId ? (
        <Panel label="Deck Cleared" tag="///" meta={domain} padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-8">
            <div>
              <h2 className="m-0 mb-3 text-xl font-medium tracking-tight text-bone-100">
                All {total} cards mastered
              </h2>
              <p className="m-0 text-sm text-mute-500">
                {seen} reviews logged
                {again.length
                  ? ` · ${again.length} required a second pass`
                  : " · no requeues"}
                .
              </p>
            </div>
            <div className="flex gap-2">
              <Status tone="go" filled>
                Complete
              </Status>
              <Button variant="signal" size="sm" onClick={restart}>
                Run Again
              </Button>
            </div>
          </div>
        </Panel>
      ) : !card ? (
        <Spinner label="Loading card" />
      ) : (
        <>
          <FlipCard
            front={card.questionText}
            back={cardBack(card)}
            meta={card.domain ?? undefined}
            index={mastered + 1}
            total={total}
            stack={queue.length - 1}
            flipped={isFlipped}
            onFlip={() => setIsFlipped((f) => !f)}
          />

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                variant="caution"
                size="sm"
                onClick={() => advance("again")}
              >
                Again
              </Button>
              <Button variant="go" size="sm" onClick={() => advance("known")}>
                Got It
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFlipped((f) => !f)}
              >
                {isFlipped ? "Hide Answer" : "Reveal"}
              </Button>
              <Button variant="ghost" size="sm" onClick={restart}>
                Restart
              </Button>
            </div>
          </div>

          <Rule label="Keys" className="mt-10" />
          <div className="mt-4 flex flex-wrap gap-8">
            {[
              ["Space", "Reveal / hide"],
              ["1 or ←", "Again"],
              ["2 or →", "Got it"],
            ].map(([key, meaning]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="border border-line-strong px-[7px] py-[3px] font-mono text-3xs tracking-mono text-bone-100">
                  {key}
                </span>
                <span className="label-mono text-mute-500">{meaning}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
