"use client";

import Image from "next/image";
import { useGame } from "@/lib/hooks/useGame";
import { useState, useMemo } from "react";
import type { IFilePairWithFiles } from "@/lib/types";

type GameState = "landing" | "playing" | "results" | "final";

interface RoundResult {
  correct: boolean;
  points: number;
}

export default function Home() {
  const { data: game, isLoading, error } = useGame();
  const [gameState, setGameState] = useState<GameState>("landing");
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedReal, setSelectedReal] = useState(false);

  // Randomize image positions for each round
  const randomizedPairs = useMemo(() => {
    if (!game) return [];
    return game.file_pairs.map((pair) => {
      const isRealLeft = Math.random() > 0.5;
      return {
        ...pair,
        leftImage: isRealLeft ? pair.real_file : pair.generated_file,
        rightImage: isRealLeft ? pair.generated_file : pair.real_file,
        isRealLeft,
      };
    });
  }, [game]);

  const currentPair = randomizedPairs[currentRound];

  const startGame = () => {
    setGameState("playing");
    setCurrentRound(0);
    setScore(0);
    setRoundResults([]);
    setHasVoted(false);
  };

  const handleVote = (votedForLeft: boolean) => {
    if (!currentPair || hasVoted) return;

    const votedForReal =
      (votedForLeft && currentPair.isRealLeft) ||
      (!votedForLeft && !currentPair.isRealLeft);

    setSelectedReal(votedForReal);
    setHasVoted(true);

    // Calculate points based on difficulty (how many people voted correctly)
    const totalVotes =
      currentPair.real_vote_count + currentPair.generated_vote_count;
    const realVotePercentage =
      totalVotes > 0 ? currentPair.real_vote_count / totalVotes : 0.5;
    const difficulty = Math.abs(0.5 - realVotePercentage); // 0 = 50/50, 0.5 = 100/0
    const points = votedForReal ? Math.round(100 + difficulty * 200) : 0;

    setScore((prev) => prev + points);
    setRoundResults((prev) => [...prev, { correct: votedForReal, points }]);
    setGameState("results");
  };

  const nextRound = () => {
    if (currentRound < randomizedPairs.length - 1) {
      setCurrentRound((prev) => prev + 1);
      setHasVoted(false);
      setGameState("playing");
    } else {
      setGameState("final");
    }
  };

  const shareOnX = () => {
    const url = window.location.href;
    const text = `I scored ${score} points in today's ImageGuessr! Can you beat my score? Play now at ${url}`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}`;
    window.open(shareUrl, "_blank");
  };

  const copyToClipboard = async () => {
    const url = window.location.href;
    const text = `I scored ${score} points in today's ImageGuessr! Can you beat my score? Play now at ${url}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Score copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-zinc-900 border-r-transparent dark:border-zinc-50 dark:border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Loading today's game...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-md rounded-lg bg-red-50 p-6 text-center dark:bg-red-900/20">
          <p className="text-red-800 dark:text-red-400">
            Error:{" "}
            {error instanceof Error ? error.message : "Failed to load game"}
          </p>
        </div>
      </div>
    );
  }

  // Landing Page
  if (gameState === "landing" && game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            ImageGuessr
          </h1>
          <p className="mt-4 text-xl text-zinc-600 dark:text-zinc-400">
            Can you tell which image is real?
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
            {game.file_pairs.length} rounds • Game for {game.date}
          </p>
          <button
            onClick={startGame}
            className="mt-8 rounded-lg bg-zinc-900 px-8 py-4 text-lg font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Start Daily Game
          </button>
        </div>
      </div>
    );
  }

  // Playing/Results State
  if ((gameState === "playing" || gameState === "results") && currentPair) {
    return (
      <div className="min-h-screen bg-zinc-50 py-8 dark:bg-zinc-950">
        <div className="mx-auto max-w-5xl px-4">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Round {currentRound + 1} of {randomizedPairs.length}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Current Score: {score} points
              </p>
            </div>
          </div>

          {/* Question / Result Header */}
          {!hasVoted ? (
            <p className="mb-6 text-center text-lg font-medium text-zinc-900 dark:text-zinc-50">
              Which image is real?
            </p>
          ) : (
            <div className="mb-6">
              <div
                className={`rounded-lg p-6 text-center ${
                  selectedReal
                    ? "bg-green-50 dark:bg-green-900/20"
                    : "bg-red-50 dark:bg-red-900/20"
                }`}
              >
                <p
                  className={`text-2xl font-bold ${
                    selectedReal
                      ? "text-green-800 dark:text-green-400"
                      : "text-red-800 dark:text-red-400"
                  }`}
                >
                  {selectedReal ? "Correct!" : "Incorrect"}
                </p>
                <p className="mt-2 text-lg text-zinc-700 dark:text-zinc-300">
                  {selectedReal
                    ? `+${
                        roundResults[roundResults.length - 1]?.points || 0
                      } points`
                    : "0 points"}
                </p>
              </div>
            </div>
          )}

          {/* Images */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Image */}
            <div className="space-y-4">
              <div
                className={`relative aspect-square overflow-hidden rounded-lg ${
                  hasVoted
                    ? currentPair.isRealLeft
                      ? "ring-4 ring-green-500"
                      : "ring-4 ring-red-500"
                    : "bg-zinc-100 dark:bg-zinc-800"
                }`}
              >
                <Image
                  src={currentPair.leftImage.url}
                  alt="Image A"
                  fill
                  className="object-cover"
                />
              </div>
              {!hasVoted ? (
                <button
                  onClick={() => handleVote(true)}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  This is real
                </button>
              ) : (
                <div className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
                  <p className="text-center font-medium text-zinc-900 dark:text-zinc-50">
                    {currentPair.isRealLeft ? "Real Photo" : "AI-Generated"}
                  </p>
                  <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    {currentPair.isRealLeft
                      ? `${currentPair.real_vote_count} votes`
                      : `${currentPair.generated_vote_count} votes`}
                  </p>
                </div>
              )}
            </div>

            {/* Right Image */}
            <div className="space-y-4">
              <div
                className={`relative aspect-square overflow-hidden rounded-lg ${
                  hasVoted
                    ? !currentPair.isRealLeft
                      ? "ring-4 ring-green-500"
                      : "ring-4 ring-red-500"
                    : "bg-zinc-100 dark:bg-zinc-800"
                }`}
              >
                <Image
                  src={currentPair.rightImage.url}
                  alt="Image B"
                  fill
                  className="object-cover"
                />
              </div>
              {!hasVoted ? (
                <button
                  onClick={() => handleVote(false)}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  This is real
                </button>
              ) : (
                <div className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
                  <p className="text-center font-medium text-zinc-900 dark:text-zinc-50">
                    {!currentPair.isRealLeft ? "Real Photo" : "AI-Generated"}
                  </p>
                  <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    {!currentPair.isRealLeft
                      ? `${currentPair.real_vote_count} votes`
                      : `${currentPair.generated_vote_count} votes`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Next Round Button */}
          {hasVoted && (
            <div className="mt-8">
              <button
                onClick={nextRound}
                className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {currentRound < randomizedPairs.length - 1
                  ? "Next Round"
                  : "See Results"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Final Results
  if (gameState === "final" && game) {
    const correctCount = roundResults.filter((r) => r.correct).length;
    const accuracy = (correctCount / roundResults.length) * 100;

    // Calculate percentile based on game results
    const allScores = game.game_results.map((r) => r.points_scored);
    const scoresBelowUser = allScores.filter((s) => s < score).length;
    const percentile =
      allScores.length > 0
        ? Math.round((scoresBelowUser / allScores.length) * 100)
        : 50;

    // Create histogram bins
    const maxScore = Math.max(...allScores, score);
    const minScore = Math.min(...allScores, score);
    const binCount = 10;
    const binSize = Math.ceil((maxScore - minScore) / binCount);
    const bins = Array(binCount).fill(0);
    const binRanges = Array(binCount)
      .fill(0)
      .map((_, i) => ({
        min: minScore + i * binSize,
        max: minScore + (i + 1) * binSize,
      }));

    // Fill bins
    allScores.forEach((s) => {
      const binIndex = Math.min(
        Math.floor((s - minScore) / binSize),
        binCount - 1
      );
      bins[binIndex]++;
    });

    // Find which bin the user's score falls into
    const userBinIndex = Math.min(
      Math.floor((score - minScore) / binSize),
      binCount - 1
    );

    const maxBinCount = Math.max(...bins);

    return (
      <div className="min-h-screen bg-zinc-50 py-12 dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              Game Complete!
            </h1>
            <div className="mt-8 rounded-lg bg-white p-8 shadow-sm dark:bg-zinc-900">
              <p className="text-6xl font-bold text-zinc-900 dark:text-zinc-50">
                {score}
              </p>
              <p className="mt-2 text-xl text-zinc-600 dark:text-zinc-400">
                Total Points
              </p>
              <p className="mt-4 text-lg text-zinc-700 dark:text-zinc-300">
                {correctCount} / {roundResults.length} correct (
                {accuracy.toFixed(0)}%)
              </p>
            </div>

            {/* Comparison with Other Players */}
            {game.game_results.length > 0 && (
              <div className="mt-8 rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  How You Compare
                </h2>
                <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                  Top {100 - percentile}%
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Better than {percentile}% of {allScores.length} players
                </p>

                {/* Histogram */}
                <div className="mt-6">
                  <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Score Distribution
                  </p>
                  <div className="flex items-end justify-between gap-1 h-32">
                    {bins.map((count, index) => {
                      const height =
                        maxBinCount > 0 ? (count / maxBinCount) * 100 : 0;
                      const isUserBin = index === userBinIndex;
                      return (
                        <div
                          key={index}
                          className="flex flex-1 flex-col items-center"
                        >
                          <div className="relative w-full">
                            <div
                              className={`w-full rounded-t transition-all ${
                                isUserBin
                                  ? "bg-blue-600 dark:bg-blue-500"
                                  : "bg-zinc-300 dark:bg-zinc-700"
                              }`}
                              style={{
                                height: `${height}%`,
                                minHeight: count > 0 ? "4px" : "0px",
                              }}
                            >
                              {isUserBin && (
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-blue-600 dark:text-blue-400">
                                  You
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-500">
                    <span>{minScore}</span>
                    <span>{maxScore}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Round Summary */}
            <div className="mt-8 space-y-3">
              {roundResults.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-white p-4 dark:bg-zinc-900"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    Round {index + 1}
                  </span>
                  <span
                    className={`font-medium ${
                      result.correct
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {result.correct ? `+${result.points}` : "0"} pts
                  </span>
                </div>
              ))}
            </div>

            {/* Share Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={copyToClipboard}
                className="flex-1 rounded-lg bg-blue-600 px-6 py-4 font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Challenge a Friend
              </button>
              <button
                onClick={shareOnX}
                className="flex-1 rounded-lg bg-blue-600 px-6 py-4 font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Share on X
              </button>
            </div>

            <button
              onClick={() => {
                setGameState("landing");
                setCurrentRound(0);
                setScore(0);
                setRoundResults([]);
                setHasVoted(false);
              }}
              className="mt-4 w-full rounded-lg bg-zinc-900 px-8 py-4 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
