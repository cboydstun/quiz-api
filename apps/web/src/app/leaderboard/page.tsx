"use client";

import { useState } from "react";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

const GET_LEADERBOARD: TypedDocumentNode<
  GetLeaderboardResult,
  GetLeaderboardVars
> = gql`
  query GetLeaderboard($limit: Int) {
    getLeaderboard(limit: $limit) {
      leaderboard {
        position
        user {
          username
          email
          score
        }
        score
      }
      currentUserEntry {
        position
        user {
          username
          email
          score
        }
        score
      }
    }
  }
`;

interface LeaderboardUser {
  username: string;
  email: string;
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
interface GetLeaderboardVars {
  limit: number;
}

export default function LeaderboardPage() {
  const [limit, setLimit] = useState(10);
  const { loading, error, data } = useQuery(GET_LEADERBOARD, {
    variables: { limit },
  });

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <p className="text-center text-xl text-red-500">
            Error: {error.message}
          </p>
        </div>
      </div>
    );

  // errorPolicy is "all" (see ApolloWrapper), so data can be absent without
  // `error` being set on a partial response.
  if (!data?.getLeaderboard)
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <p className="text-center text-xl">No leaderboard data available.</p>
        </div>
      </div>
    );

  const { leaderboard, currentUserEntry } = data.getLeaderboard;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center text-blue-600">
          Leaderboard
        </h1>

        <div className="bg-white shadow-lg rounded-lg mb-8 overflow-hidden transition-all duration-300 transform hover:scale-105">
          <div className="border-b p-4 bg-blue-500">
            <h2 className="text-2xl font-semibold text-white">Top Players</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Position
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Username
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.position}
                    className="border-b hover:bg-gray-50 transition-colors duration-200"
                  >
                    <td className="px-4 py-2">{entry.position}</td>
                    <td className="px-4 py-2">{entry.user.username}</td>
                    <td className="px-4 py-2">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {currentUserEntry && (
          <div className="bg-white shadow-lg rounded-lg mb-8 overflow-hidden transition-all duration-300 transform hover:scale-105">
            <div className="border-b p-4 bg-green-500">
              <h2 className="text-2xl font-semibold text-white">
                Your Position
              </h2>
            </div>
            <div className="p-6">
              <p className="text-xl mb-2">
                Position:{" "}
                <span className="font-bold text-blue-600">
                  {currentUserEntry.position}
                </span>
              </p>
              <p className="text-xl">
                Score:{" "}
                <span className="font-bold text-green-600">
                  {currentUserEntry.score}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            className="px-6 py-3 bg-blue-500 text-white rounded-full font-bold transition-all duration-300 transform hover:scale-105 hover:bg-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/50"
            onClick={() => setLimit((prev) => prev + 10)}
          >
            Load More
          </button>
        </div>
      </div>
    </div>
  );
}
