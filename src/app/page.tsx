"use client";

import Image from "next/image";
import { useGame } from "@/lib/hooks/useGame";

export default function Home() {
  const { data: game, isLoading, error } = useGame();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            ImageGuessr
          </h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Can you spot the AI-generated image?
          </p>
          {game && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              Game for {game.date}
            </p>
          )}
        </div>

        {isLoading && (
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-zinc-900 border-r-transparent dark:border-zinc-50 dark:border-r-transparent"></div>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              Loading today's game...
            </p>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-md rounded-lg bg-red-50 p-6 text-center dark:bg-red-900/20">
            <p className="text-red-800 dark:text-red-400">
              Error:{" "}
              {error instanceof Error ? error.message : "Failed to load game"}
            </p>
          </div>
        )}

        {game && !isLoading && (
          <div className="space-y-12">
            {game.file_pairs.map((pair, index) => (
              <div
                key={`${pair.real_file_id}-${pair.generated_file_id}`}
                className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h2 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Round {index + 1}
                </h2>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Image A */}
                  <div className="space-y-4">
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <Image
                        src={pair.real_file.url}
                        alt="Image A"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                        Image A
                      </span>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">
                          {pair.real_vote_count}
                        </span>{" "}
                        votes
                      </div>
                    </div>
                    <button className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
                      Vote for Image A
                    </button>
                  </div>

                  {/* Image B */}
                  <div className="space-y-4">
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <Image
                        src={pair.generated_file.url}
                        alt="Image B"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                        Image B
                      </span>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">
                          {pair.generated_vote_count}
                        </span>{" "}
                        votes
                      </div>
                    </div>
                    <button className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
                      Vote for Image B
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {game.file_pairs.length === 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-zinc-600 dark:text-zinc-400">
                  No image pairs available for this game yet.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
