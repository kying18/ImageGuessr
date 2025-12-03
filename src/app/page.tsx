"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { z } from "zod";
import { typedFetch } from "@/lib/typedFetch";

const FileSchema = z.object({
  id: z.string(),
  url: z.string(),
  source_type: z.enum(["real", "generated"]),
  source_id: z.string().nullable(),
  prompt: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export default function Home() {
  const [file, setFile] = useState<z.infer<typeof FileSchema> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFile() {
      try {
        setLoading(true);
        setError(null);
        const data = await typedFetch("/api/file", FileSchema);
        setFile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch file");
      } finally {
        setLoading(false);
      }
    }
    fetchFile();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex w-full flex-col gap-6">
          {loading && (
            <div className="text-center text-zinc-600 dark:text-zinc-400">
              Loading...
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
              Error: {error}
            </div>
          )}
          {file && !loading && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                File Data
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    ID:
                  </span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {file.id}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    URL:
                  </span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {file.url}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Source Type:
                  </span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {file.source_type}
                  </span>
                </div>
                {file.source_id && (
                  <div>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      Source ID:
                    </span>{" "}
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {file.source_id}
                    </span>
                  </div>
                )}
                {file.prompt && (
                  <div>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      Prompt:
                    </span>{" "}
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {file.prompt}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Created At:
                  </span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {new Date(file.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Updated At:
                  </span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {new Date(file.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
