"use client";

import Image from "next/image";
import { useGame } from "@/lib/hooks/useGame";
import { useState, useMemo } from "react";
import type { IFilePairWithFiles } from "@/lib/types";

type GameState = "landing" | "playing" | "results" | "final";

// Utility function to get optimized image URL with size parameters
function getOptimizedImageUrl(
  url: string,
  width: number = 500,
  quality: number = 75
): string {
  try {
    const urlObj = new URL(url);

    // Unsplash images - add size parameters
    if (urlObj.hostname === "images.unsplash.com") {
      urlObj.searchParams.set("w", width.toString());
      urlObj.searchParams.set("q", quality.toString());
      urlObj.searchParams.set("auto", "format");
      urlObj.searchParams.set("fit", "crop");
      return urlObj.toString();
    }

    // Vercel Blob Storage images auto-optimize via Next.js
    return url;
  } catch (e) {
    // If URL parsing fails, return original
    return url;
  }
}

interface RoundResult {
  correct: boolean;
  points: number;
  file_pair_id: string;
  voted_for_real: boolean;
}

export default function Home() {
  const { data: game, isLoading, error, refetch } = useGame();
  const [gameState, setGameState] = useState<GameState>("landing");
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedReal, setSelectedReal] = useState(false);
  const [votedForLeft, setVotedForLeft] = useState(false);

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
  const nextPair = randomizedPairs[currentRound + 1];

  const startGame = () => {
    setGameState("playing");
    setCurrentRound(0);
    setScore(0);
    setRoundResults([]);
    setHasVoted(false);
  };

  const handleVote = (clickedLeft: boolean) => {
    if (!currentPair || hasVoted || !game) return;

    const votedForReal =
      (clickedLeft && currentPair.isRealLeft) ||
      (!clickedLeft && !currentPair.isRealLeft);

    setSelectedReal(votedForReal);
    setVotedForLeft(clickedLeft);
    setHasVoted(true);

    // Calculate points based on difficulty (how many people voted correctly)
    const totalVotes =
      currentPair.real_vote_count + currentPair.generated_vote_count;
    const realVotePercentage =
      totalVotes > 0 ? currentPair.real_vote_count / totalVotes : 0.5;
    const difficulty = Math.abs(0.5 - realVotePercentage); // 0 = 50/50, 0.5 = 100/0
    const points = votedForReal ? Math.round(100 + difficulty * 200) : 0;

    setScore((prev) => prev + points);
    setRoundResults((prev) => [
      ...prev,
      {
        correct: votedForReal,
        points,
        file_pair_id: game.file_pairs[currentRound].id,
        voted_for_real: votedForReal,
      },
    ]);
    setGameState("results");
  };

  const submitGameResults = async () => {
    if (!game) return;

    try {
      // Calculate accuracy (number of correct answers)
      const correctCount = roundResults.filter((r) => r.correct).length;

      // Submit game result
      await fetch("/api/game-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points_scored: score,
          accuracy: correctCount,
          game_id: game.id,
        }),
      });

      // Update vote counts for each file pair
      await Promise.all(
        roundResults.map((result) =>
          fetch("/api/file-pair", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file_pair_id: result.file_pair_id,
              voted_for_real: result.voted_for_real,
            }),
          })
        )
      );
    } catch (error) {
      console.error("Error submitting game results:", error);
    }
  };

  const nextRound = async () => {
    if (currentRound < randomizedPairs.length - 1) {
      setCurrentRound((prev) => prev + 1);
      setHasVoted(false);
      setVotedForLeft(false);
      setGameState("playing");
    } else {
      // Submit results before showing final screen
      await submitGameResults();
      setGameState("final");
    }
  };

  const shareOnX = () => {
    const url = window.location.href;
    const text = `🍌 I scored ${score} points in today's Truth or Banana! Can you beat my score? Play now at ${url}`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}`;
    window.open(shareUrl, "_blank");
  };

  const copyToClipboard = async () => {
    const url = window.location.href;
    const text = `🍌 I scored ${score} points in today's Truth or Banana! Can you beat my score? Play now at ${url}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Score copied to clipboard! 🍌");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 dark:from-yellow-950 dark:via-amber-950 dark:to-yellow-900">
        <div className="text-center">
          <div className="mb-4 text-6xl animate-bounce">🍌</div>
          <p className="mt-4 text-yellow-800 dark:text-yellow-200">
            Loading today's game...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 dark:from-yellow-950 dark:via-amber-950 dark:to-yellow-900">
        <div className="mx-auto max-w-md rounded-lg bg-red-50 p-6 text-center dark:bg-red-900/20">
          <div className="mb-4 text-4xl">🍌❌</div>
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 dark:from-yellow-950 dark:via-amber-950 dark:to-yellow-900">
        {/* Banana pattern background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 10c-3 0-5 2-6 5-1 4 0 8 3 10 2 2 5 2 7 0 3-2 4-6 3-10-1-3-3-5-7-5zm0 2c2 0 4 1 5 3 1 3 0 6-2 8-2 1-4 1-6 0-2-2-3-5-2-8 1-2 3-3 5-3z' fill='%23fbbf24' fill-opacity='1'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="text-center relative z-10">
          <div className="mb-4 text-8xl">🍌</div>
          <h1 className="text-6xl font-bold tracking-tight text-yellow-900 dark:text-yellow-100">
            Truth or Banana
          </h1>
          <p className="mt-4 text-xl text-yellow-800 dark:text-yellow-200">
            Can you spot the real photo?
          </p>
          <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            {game.file_pairs.length} rounds • Game for {game.date}
          </p>
          <button
            onClick={startGame}
            className="mt-8 rounded-lg bg-yellow-500 px-8 py-4 text-lg font-bold text-yellow-950 transition-colors hover:bg-yellow-400 dark:bg-yellow-600 dark:text-yellow-50 dark:hover:bg-yellow-500"
          >
            🍌 Start Daily Game
          </button>
        </div>
      </div>
    );
  }

  // Playing/Results State
  if ((gameState === "playing" || gameState === "results") && currentPair) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 py-8 dark:from-yellow-950 dark:via-amber-950 dark:to-yellow-900">
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

          {/* Question Header */}
          <p className="mb-6 text-center text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Which image is real?
          </p>

          {/* Images */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Image */}
            <div className="space-y-4">
              <div
                className={`relative aspect-square overflow-hidden rounded-lg ${
                  hasVoted
                    ? votedForLeft
                      ? currentPair.isRealLeft
                        ? "ring-4 ring-green-500"
                        : "ring-4 ring-red-500"
                      : currentPair.isRealLeft
                      ? "ring-4 ring-green-500"
                      : "ring-4 ring-red-500"
                    : "bg-zinc-100 dark:bg-zinc-800"
                }`}
              >
                <Image
                  src={getOptimizedImageUrl(currentPair.leftImage.url, 500, 75)}
                  alt="Image A"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority={currentRound === 0}
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
                <div
                  className={`rounded-lg p-4 ${
                    currentPair.isRealLeft
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-red-100 dark:bg-red-900/30"
                  }`}
                >
                  <p
                    className={`text-center font-medium ${
                      currentPair.isRealLeft
                        ? "text-green-900 dark:text-green-100"
                        : "text-red-900 dark:text-red-100"
                    }`}
                  >
                    {currentPair.isRealLeft ? "Real Photo" : "AI-Generated"}
                  </p>
                  <p
                    className={`mt-2 text-center text-sm ${
                      currentPair.isRealLeft
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
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
                    ? !votedForLeft
                      ? !currentPair.isRealLeft
                        ? "ring-4 ring-green-500"
                        : "ring-4 ring-red-500"
                      : !currentPair.isRealLeft
                      ? "ring-4 ring-green-500"
                      : "ring-4 ring-red-500"
                    : "bg-zinc-100 dark:bg-zinc-800"
                }`}
              >
                <Image
                  src={getOptimizedImageUrl(
                    currentPair.rightImage.url,
                    500,
                    75
                  )}
                  alt="Image B"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority={currentRound === 0}
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
                <div
                  className={`rounded-lg p-4 ${
                    !currentPair.isRealLeft
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-red-100 dark:bg-red-900/30"
                  }`}
                >
                  <p
                    className={`text-center font-medium ${
                      !currentPair.isRealLeft
                        ? "text-green-900 dark:text-green-100"
                        : "text-red-900 dark:text-red-100"
                    }`}
                  >
                    {!currentPair.isRealLeft ? "Real Photo" : "AI-Generated"}
                  </p>
                  <p
                    className={`mt-2 text-center text-sm ${
                      !currentPair.isRealLeft
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {!currentPair.isRealLeft
                      ? `${currentPair.real_vote_count} votes`
                      : `${currentPair.generated_vote_count} votes`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Result Message - Only show after voting */}
          {hasVoted && (
            <div className="my-8">
              <div
                className={`rounded-lg p-6 text-center relative overflow-hidden ${
                  selectedReal
                    ? "bg-green-200 dark:bg-green-900/50"
                    : "bg-red-200 dark:bg-red-900/50"
                }`}
              >
                {/* Animated banana emoji */}
                <div className="text-6xl mb-2 animate-[bounce_1s_ease-in-out_3]">
                  <span className="inline-block animate-[scale-in_0.5s_ease-out]">
                    {selectedReal ? "🍌" : "🍌💔"}
                  </span>
                </div>

                <p
                  className={`text-2xl font-bold ${
                    selectedReal
                      ? "text-green-800 dark:text-green-400"
                      : "text-red-800 dark:text-red-400"
                  }`}
                >
                  {selectedReal
                    ? "Correct! You are wiser than the banana!"
                    : "The banana tricked you!"}
                </p>
                <p className="mt-2 text-lg text-zinc-700 dark:text-zinc-500">
                  {selectedReal
                    ? `+${
                        roundResults[roundResults.length - 1]?.points || 0
                      } banana points 🍌`
                    : "0 banana points"}
                </p>

                {/* Floating bananas animation */}
                {selectedReal && (
                  <>
                    <div className="absolute text-4xl animate-float-up-left">
                      🍌
                    </div>
                    <div
                      className="absolute text-4xl animate-float-up-right"
                      style={{ animationDelay: "0.2s" }}
                    >
                      🍌
                    </div>
                    <div
                      className="absolute text-3xl animate-float-up-center"
                      style={{ animationDelay: "0.4s" }}
                    >
                      🍌
                    </div>
                  </>
                )}
                {!selectedReal && (
                  <>
                    <div className="absolute text-4xl animate-float-down-left">
                      🍌💨
                    </div>
                    <div
                      className="absolute text-4xl animate-float-down-right"
                      style={{ animationDelay: "0.2s" }}
                    >
                      🍌🚮
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

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

          {/* Preload next round's images */}
          {nextPair && (
            <div className="hidden">
              <Image
                src={getOptimizedImageUrl(nextPair.leftImage.url, 500, 75)}
                alt="Preload"
                width={500}
                height={500}
                priority
              />
              <Image
                src={getOptimizedImageUrl(nextPair.rightImage.url, 500, 75)}
                alt="Preload"
                width={500}
                height={500}
                priority
              />
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

    // Fill bins with existing scores
    allScores.forEach((s) => {
      const binIndex = Math.min(
        Math.floor((s - minScore) / binSize),
        binCount - 1
      );
      bins[binIndex]++;
    });

    // Find which bin the user's score falls into and add it
    const userBinIndex = Math.min(
      Math.floor((score - minScore) / binSize),
      binCount - 1
    );
    bins[userBinIndex]++;

    const maxBinCount = Math.max(...bins);

    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 py-12 dark:from-yellow-950 dark:via-amber-950 dark:to-yellow-900">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <div className="mb-4 text-6xl">🍌</div>
            <h1 className="text-4xl font-bold text-yellow-900 dark:text-yellow-100">
              Banana Score! 🎉
            </h1>
            <div className="mt-8 rounded-lg bg-yellow-100 p-8 shadow-lg dark:bg-yellow-900/50">
              <p className="text-6xl font-bold text-yellow-900 dark:text-yellow-100">
                {score}
              </p>
              <p className="mt-2 text-xl text-yellow-800 dark:text-yellow-200">
                Total Bananas 🍌
              </p>
              <p className="mt-4 text-lg text-yellow-700 dark:text-yellow-300">
                {correctCount} / {roundResults.length} correct (
                {accuracy.toFixed(0)}%)
              </p>
            </div>

            {/* Comparison with Other Players */}
            {game.game_results.length > 0 && (
              <div className="mt-8 rounded-lg bg-yellow-100 p-6 shadow-lg dark:bg-yellow-900/50">
                <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-100">
                  How You Compare
                </h2>
                <p className="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  Top {100 - percentile}% 🍌
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Better than {percentile}% of {allScores.length} players
                </p>

                {/* Histogram */}
                <div className="mt-6">
                  <p className="mb-3 text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Banana Distribution 🍌
                  </p>
                  <div className="relative h-48">
                    <div className="flex h-full items-end justify-between gap-2">
                      {bins.map((count, index) => {
                        const height =
                          maxBinCount > 0 ? (count / maxBinCount) * 100 : 0;
                        const isUserBin = index === userBinIndex;
                        return (
                          <div
                            key={index}
                            className="relative flex flex-1 items-end justify-center"
                          >
                            {isUserBin && count > 0 && (
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-yellow-700 dark:text-yellow-300">
                                🍌
                              </div>
                            )}
                            <div
                              className={`w-full rounded-t transition-all ${
                                isUserBin
                                  ? "bg-yellow-500 dark:bg-yellow-600"
                                  : "bg-yellow-300 dark:bg-yellow-700"
                              }`}
                              style={{
                                height: `${height}px`,
                                minHeight: count > 0 ? "12px" : "0px",
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-yellow-700 dark:text-yellow-400">
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
                  className="flex items-center justify-between rounded-lg bg-yellow-100 p-4 dark:bg-yellow-900/50"
                >
                  <span className="text-yellow-800 dark:text-yellow-200">
                    Round {index + 1}
                  </span>
                  <span
                    className={`font-medium ${
                      result.correct
                        ? "text-green-700 dark:text-green-400"
                        : "text-red-700 dark:text-red-400"
                    }`}
                  >
                    {result.correct ? `+${result.points} 🍌` : "0"}
                  </span>
                </div>
              ))}
            </div>

            {/* Share Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={copyToClipboard}
                className="flex-1 rounded-lg bg-yellow-500 px-6 py-4 font-bold text-yellow-950 transition-colors hover:bg-yellow-400 dark:bg-yellow-600 dark:text-yellow-50 dark:hover:bg-yellow-500"
              >
                🍌 Challenge a Friend
              </button>
              <button
                onClick={shareOnX}
                className="flex-1 rounded-lg bg-yellow-500 px-6 py-4 font-bold text-yellow-950 transition-colors hover:bg-yellow-400 dark:bg-yellow-600 dark:text-yellow-50 dark:hover:bg-yellow-500"
              >
                Share on X
              </button>
            </div>

            <button
              onClick={async () => {
                setGameState("landing");
                setCurrentRound(0);
                setScore(0);
                setRoundResults([]);
                setHasVoted(false);
                // Refetch game data to get updated results
                await refetch();
              }}
              className="mt-4 w-full rounded-lg bg-yellow-600 px-8 py-4 font-bold text-yellow-50 transition-colors hover:bg-yellow-500 dark:bg-yellow-700 dark:text-yellow-100 dark:hover:bg-yellow-600"
            >
              🍌 Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
