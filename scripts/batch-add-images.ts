/**
 * Batch process multiple images and optionally create a game
 */

import { config } from "dotenv";
// Load environment variables from .env.local
config({ path: ".env.local" });

import { processImagePair } from "./add-image-pair";
import { supabaseAdmin } from "../src/lib/supabase";
import * as fs from "fs";
import * as path from "path";

interface BatchResult {
  gameId?: string;
  filePairs: Array<{
    realFileId: string;
    generatedFileId: string;
    prompt: string;
  }>;
}

async function createGame(date: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("games")
    .insert({ date })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create game: ${error.message}`);
  }

  console.log(`Created game for ${date}: ${data.id}`);
  return data.id;
}

async function createFilePair(
  realFileId: string,
  generatedFileId: string,
  gameId: string
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("file_pairs")
    .insert({
      real_file_id: realFileId,
      generated_file_id: generatedFileId,
      game_id: gameId,
      real_vote_count: 0,
      generated_vote_count: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create file pair: ${error.message}`);
  }

  return data.id;
}

async function batchProcessImages(
  imageUrls: string[],
  createGameForDate?: string
): Promise<BatchResult> {
  console.log("\n🍌 === Batch Processing Images === 🍌\n");
  console.log(`Processing ${imageUrls.length} images...`);

  const filePairs = [];
  let gameId: string | undefined;

  // Create game if date provided
  if (createGameForDate) {
    gameId = await createGame(createGameForDate);
  }

  // Process each image
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    console.log(`\n[${i + 1}/${imageUrls.length}] Processing: ${url}`);

    try {
      const result = await processImagePair(url);
      filePairs.push(result);

      // Create file pair if game exists
      if (gameId) {
        await createFilePair(result.realFileId, result.generatedFileId, gameId);
        console.log("✅ Added to game");
      }

      // Rate limiting
      if (i < imageUrls.length - 1) {
        console.log("Waiting 2 seconds before next image...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`❌ Failed to process ${url}:`, error);
      // Continue with other images
    }
  }

  console.log("\n🎉 Batch processing complete!");
  console.log(
    `Successfully processed: ${filePairs.length}/${imageUrls.length}`
  );

  return { gameId, filePairs };
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  # Process multiple images (no game creation)
  npx tsx scripts/batch-add-images.ts <url1> <url2> <url3>...

  # Process images and create game for specific date
  npx tsx scripts/batch-add-images.ts --date 2024-01-15 <url1> <url2> <url3>...

  # Process images from a file (one URL per line)
  npx tsx scripts/batch-add-images.ts --file images.txt

  # Process from file and create game
  npx tsx scripts/batch-add-images.ts --date 2024-01-15 --file images.txt

Examples:
  npx tsx scripts/batch-add-images.ts \\
    https://images.unsplash.com/photo-1 \\
    https://images.unsplash.com/photo-2 \\
    https://images.unsplash.com/photo-3

  npx tsx scripts/batch-add-images.ts --date 2024-12-08 --file images.csv
`);
    process.exit(1);
  }

  let date: string | undefined;
  let urls: string[] = [];

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--date" && args[i + 1]) {
      date = args[i + 1];
      i++; // Skip next arg
    } else if (args[i] === "--file" && args[i + 1]) {
      const filePath = args[i + 1];
      const content = fs.readFileSync(filePath, "utf-8");
      const fileUrls = content
        .split("\n")
        .map((line) => line.trim())
        .filter(
          (line) => line && !line.startsWith("#") && line.startsWith("http")
        );
      urls.push(...fileUrls);
      i++; // Skip next arg
    } else if (args[i].startsWith("http")) {
      urls.push(args[i]);
    }
  }

  if (urls.length === 0) {
    console.error("❌ No valid image URLs provided");
    process.exit(1);
  }

  batchProcessImages(urls, date)
    .then((result) => {
      console.log("\n📊 Final Results:");
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Batch processing failed:", error);
      process.exit(1);
    });
}

export { batchProcessImages };
