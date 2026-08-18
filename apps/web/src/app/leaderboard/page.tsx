"use client";

import { useState } from "react";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Alert,
  Button,
  DataTable,
  Label,
  Panel,
  Readout,
  Spinner,
} from "@/components/ds";

const GET_LEADERBOARD: TypedDocumentNode<
  GetLeaderboardResult,
  GetLeaderboardVars
> = gql`
  query GetLeaderboard($limit: Int, $period: LeaderboardPeriod) {
    getLeaderboard(limit: $limit, period: $period) {
      leaderboard {
        position
        user {
          username
          score
        }
        score
      }
      currentUserEntry {
        position
        user {
          username
          score
        }
        score
      }
    }
  }
`;

// Accuracy is the viewer's own record, so it needs a token — hence a separate
// document, skipped while signed out. getLeaderboard itself is public and must
// stay that way: /leaderboard has no route guard.
const GET_MY_ACCURACY: TypedDocumentNode<GetMyAccuracyResult> = gql`
  query GetMyAccuracy {
    me {
      id
      questionsAnswered
      questionsCorrect
    }
  }
`;

interface LeaderboardUser {
  username: string;
  score: number;
}

interface LeaderboardEntry {
  position: number;
  user: LeaderboardUser;
  score: number;
}

interface GetLeaderboardResult {
  getLeaderboard: {
    leaderboard: LeaderboardEntry[];
    currentUserEntry: LeaderboardEntry | null;
  } | null;
}
type LeaderboardPeriod = "ALL_TIME" | "DAILY" | "WEEKLY" | "MONTHLY";

interface GetLeaderboardVars {
  limit: number;
  period: LeaderboardPeriod;
}

/**
 * All-time ranks the stored score, which carries the history imported from the
 * old backend. The windowed boards are computed from answer history, so they
 * only know about answers recorded since the cutover — which is why the page
 * says so under an empty one rather than implying nobody has played.
 */
const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "ALL_TIME", label: "All Time" },
  { value: "MONTHLY", label: "Month" },
  { value: "WEEKLY", label: "Week" },
  { value: "DAILY", label: "Today" },
];

interface GetMyAccuracyResult {
  me: {
    id: string;
    questionsAnswered: number;
    questionsCorrect: number;
  } | null;
}

const PAGE = 10;

export default function LeaderboardPage() {
  const [limit, setLimit] = useState(PAGE);
  const [period, setPeriod] = useState<LeaderboardPeriod>("ALL_TIME");
  const { user } = useAuth();
  const { loading, error, data } = useQuery(GET_LEADERBOARD, {
    variables: { limit, period },
  });
  const { data: meData } = useQuery(GET_MY_ACCURACY, { skip: !user });

  if (loading) return <Spinner label="Loading standings" />;

  if (error) {
    return (
      <div className="mx-auto max-w-mid px-4 sm:px-8 py-16">
        <Alert tone="abort">{error.message}</Alert>
      </div>
    );
  }

  // errorPolicy is "all" (see ApolloWrapper), so data can be absent without
  // `error` being set on a partial response.
  if (!data?.getLeaderboard) {
    return (
      <div className="mx-auto max-w-mid px-4 sm:px-8 py-16">
        <Alert tone="info" kicker="NOTICE">
          No standings recorded yet.
        </Alert>
      </div>
    );
  }

  const { leaderboard, currentUserEntry } = data.getLeaderboard;
  const me = meData?.me;

  const accuracy =
    me && me.questionsAnswered > 0
      ? Math.round((me.questionsCorrect / me.questionsAnswered) * 1000) / 10
      : null;

  const rows = leaderboard.map((entry) => [
    String(entry.position).padStart(2, "0"),
    entry.user.username,
    entry.score.toLocaleString(),
  ]);

  const highlightIndex = currentUserEntry
    ? leaderboard.findIndex((e) => e.position === currentUserEntry.position)
    : -1;

  // The page is full when the server returned everything it was asked for.
  const exhausted = leaderboard.length < limit;

  return (
    <div className="mx-auto max-w-mid px-4 sm:px-8 py-16">
      <Label tag="///" className="mb-6">
        Standings
      </Label>
      <h1 className="m-0 mb-8 text-2xl font-medium tracking-tight text-bone-100">
        Leaderboard
      </h1>

      {/*
        A single all-time board means anyone who arrives after the leaders have
        a five-figure head start is looking at a table they cannot enter. A
        daily one is winnable by somebody who started today.
      */}
      <div className="mb-8 flex flex-wrap gap-2">
        {PERIODS.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            size="sm"
            selected={period === option.value}
            onClick={() => {
              setPeriod(option.value);
              setLimit(PAGE);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {currentUserEntry && (
        <div className="mb-8 grid grid-cols-1 gap-px border border-line-hairline bg-line-hairline sm:grid-cols-3">
          <div className="bg-ink-800">
            <Readout
              label="Your Position"
              value={String(currentUserEntry.position).padStart(2, "0")}
              tone="signal"
            />
          </div>
          <div className="bg-ink-800">
            <Readout
              label="Your Score"
              value={currentUserEntry.score.toLocaleString()}
              unit="pts"
            />
          </div>
          <div className="bg-ink-800">
            <Readout
              label="Accuracy"
              value={accuracy === null ? "—" : accuracy}
              unit={accuracy === null ? undefined : "%"}
              tone={accuracy !== null && accuracy >= 70 ? "go" : "caution"}
            />
          </div>
        </div>
      )}

      <Panel
        label="Top Operators"
        meta={`${PERIODS.find((p) => p.value === period)?.label} · ${leaderboard.length} shown`}
        padding="none"
      >
        <DataTable
          columns={["Pos", "Operator", "Score"]}
          rows={rows}
          highlightIndex={highlightIndex}
          empty={
            period === "ALL_TIME"
              ? "No operators ranked yet."
              : "Nobody has answered anything in this window yet."
          }
        />
        <div className="border-t border-line-hairline p-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={exhausted}
            onClick={() => setLimit((prev) => prev + PAGE)}
          >
            {exhausted ? "End of Standings" : "Load More"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
