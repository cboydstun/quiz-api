"use client";

import { useState, useEffect } from "react";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useLazyQuery, useQuery } from "@apollo/client/react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const GET_QUESTION_IDS: TypedDocumentNode<GetQuestionIdsResult> = gql`
  query GetQuestionIds {
    questions {
      id
    }
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
}

interface GetQuestionIdsResult {
  questions: { id: string }[] | null;
}

interface GetQuestionResult {
  question: FlashCard | null;
}
interface GetQuestionVars {
  id: string;
}

export default function FlashCardsPage() {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]);
  const [questionIds, setQuestionIds] = useState<string[]>([]);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const {
    loading: idsLoading,
    error: idsError,
    data: idsData,
  } = useQuery(GET_QUESTION_IDS);
  const [getQuestion, { loading: questionLoading, error: questionError }] =
    useLazyQuery(GET_QUESTION);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (idsData?.questions) {
      setQuestionIds(idsData.questions.map((q) => q.id));
    }
  }, [idsData]);

  useEffect(() => {
    if (
      questionIds.length > 0 &&
      currentCardIndex >= flashCards.length &&
      currentCardIndex < questionIds.length
    ) {
      getQuestion({ variables: { id: questionIds[currentCardIndex] } })
        .then(({ data }) => {
          const question = data?.question;
          if (question) {
            setFlashCards((prev) => [...prev, question]);
          }
        })
        .catch((err) => console.error("Error fetching question:", err));
    }
  }, [questionIds, currentCardIndex, flashCards, getQuestion]);

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNextCard = () => {
    if (currentCardIndex < questionIds.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  const renderCardBack = (card: FlashCard): string[] => {
    if (!card.correctAnswer) return ["No answer recorded"];
    if (card.correctAnswer.toLowerCase() === "all of the above") {
      return card.answers.filter(
        (answer) => answer.toLowerCase() !== "all of the above",
      );
    }
    return [card.correctAnswer];
  };

  if (authLoading || idsLoading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  if (idsError)
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <p className="text-center text-xl text-red-500">
            Error loading question IDs: {idsError.message}
          </p>
        </div>
      </div>
    );
  if (!user) return null; // This prevents any flash of content before redirect
  if (questionIds.length === 0)
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <p className="text-center text-xl">No flash cards available.</p>
        </div>
      </div>
    );

  const currentCard = flashCards[currentCardIndex];

  if (questionLoading || !currentCard)
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  if (questionError)
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <p className="text-center text-xl text-red-500">
            Error loading question: {questionError.message}
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen py-6">
      <div className="container mx-auto p-4 max-w-2xl">
        <h1 className="text-4xl font-bold mb-8 text-center text-blue-600">
          Drone Pilot Flash Cards
        </h1>
        <p className="text-center mb-8 text-xl text-gray-700">
          Welcome, {user.username}!
        </p>

        <div
          className={`flip-card w-full h-80 mb-8 cursor-pointer transition-transform duration-300 transform hover:scale-105 ${
            isFlipped ? "flipped" : ""
          }`}
          onClick={handleCardClick}
        >
          <div className="flip-card-inner relative w-full h-full transition-transform duration-500 transform-style-preserve-3d">
            <div className="flip-card-front absolute w-full h-full bg-white border-2 border-blue-300 rounded-lg shadow-lg p-6 flex flex-col items-center justify-center backface-hidden">
              <p className="text-2xl text-center text-gray-800">
                {currentCard.questionText}
              </p>
            </div>
            <div className="flip-card-back absolute w-full h-full bg-blue-100 border-2 border-blue-300 rounded-lg shadow-lg p-6 flex flex-col items-center justify-center backface-hidden transform rotate-y-180">
              {renderCardBack(currentCard).map((answer, index) => (
                <p
                  key={index}
                  className="text-xl text-center mb-2 text-gray-800"
                >
                  {answer}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={handlePreviousCard}
            disabled={currentCardIndex === 0}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous Card
          </button>
          <button
            onClick={handleNextCard}
            disabled={currentCardIndex === questionIds.length - 1}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Card
          </button>
        </div>

        <p className="text-center mt-8 text-xl text-gray-700">
          Card {currentCardIndex + 1} of {questionIds.length}
        </p>
      </div>

      <style jsx>{`
        .flip-card {
          perspective: 1000px;
        }
        .flip-card-inner {
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }
        .flip-card-front,
        .flip-card-back {
          backface-visibility: hidden;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
