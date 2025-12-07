import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "../supabase";
import fetch from "node-fetch";

// Initialize Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

interface ImagePairResult {
  realFileId: string;
  generatedFileId: string;
  prompt: string;
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function generateImageDescription(imageUrl: string): Promise<string> {
  console.log("Generating description for image...");

  // Download the image
  const imageBuffer = await downloadImage(imageUrl);
  const base64Image = imageBuffer.toString("base64");

  // Use Gemini Vision to describe the image
  const modelName = "gemini-2.5-flash-lite";

  const prompt = `Describe this image in a few sentences. This will be used to generate an image similar to the original image.

Include details about:
- Main subject(s) and their appearance
- Setting/environment
- Lighting and atmosphere
- Colors and composition
- Lens details and style (if applicable)

Keep it concise but descriptive (2-3 sentences). Do not mention that this is a photo or real image.`;

  const result = await ai.models.generateContent({
    model: modelName,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  });

  const description = result.responseId;
  console.log("Generated description:", description);
  return description ?? "";
}

async function generateImageWithImagen(description: string): Promise<Buffer> {
  console.log("Generating AI image with Imagen...");

  const modelName = "imagen-3.0-generate-001";
  const prompt = `Generate an image similar to the following description: ${description}`;

  const response = await ai.models.generateImages({
    model: modelName,
    prompt: prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "4:3",
    },
  });

  let imgBytes = response.generatedImages?.[0]?.image?.imageBytes ?? "";
  if (!imgBytes) {
    throw new Error("No images generated");
  }
  return Buffer.from(imgBytes, "base64");
}

async function uploadToSupabaseStorage(
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  console.log(`Uploading ${filename} to Supabase storage...`);

  const { data, error } = await supabaseAdmin.storage
    .from("images")
    .upload(filename, imageBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload to storage: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("images").getPublicUrl(data.path);

  console.log(`Uploaded to: ${publicUrl}`);
  return publicUrl;
}

async function insertFileRecord(
  url: string,
  sourceType: "real" | "generated",
  sourceId: string | null,
  prompt: string | null
): Promise<string> {
  console.log(`Inserting ${sourceType} file record...`);

  const { data, error } = await supabaseAdmin
    .from("files")
    .insert({
      url,
      source_type: sourceType,
      source_id: sourceId,
      prompt,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert file record: ${error.message}`);
  }

  console.log(`Created file record: ${data.id}`);
  return data.id;
}

async function getOrCreateModel(modelName: string): Promise<string> {
  // Check if model exists
  const { data: existing } = await supabaseAdmin
    .from("models")
    .select("id")
    .eq("name", modelName)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new model
  const { data, error } = await supabaseAdmin
    .from("models")
    .insert({ name: modelName })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create model record: ${error.message}`);
  }

  return data.id;
}

export async function processImagePair(
  realImageUrl: string
): Promise<ImagePairResult> {
  try {
    console.log("\n=== Processing Image Pair ===");
    console.log("Real image URL:", realImageUrl);

    // Step 1: Download real image
    console.log("\n1. Downloading real image...");
    const realImageBuffer = await downloadImage(realImageUrl);

    // Step 2: Generate description with Gemini
    console.log("\n2. Generating description with Gemini...");
    const prompt = await generateImageDescription(realImageUrl);

    // Step 3: Generate AI image with Imagen
    console.log("\n3. Generating AI image with Imagen...");
    const generatedImageBuffer = await generateImageWithImagen(prompt);

    // Step 4: Upload both images to Supabase Storage
    console.log("\n4. Uploading images to Supabase...");
    const timestamp = Date.now();
    const realImageFilename = `real/${timestamp}-real.jpg`;
    const generatedImageFilename = `generated/${timestamp}-generated.jpg`;

    const realImagePublicUrl = await uploadToSupabaseStorage(
      realImageBuffer,
      realImageFilename
    );
    const generatedImagePublicUrl = await uploadToSupabaseStorage(
      generatedImageBuffer,
      generatedImageFilename
    );

    // Step 5: Get or create model record
    console.log("\n5. Creating model record...");
    const modelId = await getOrCreateModel("Imagen 3");

    // Step 6: Insert file records
    console.log("\n6. Inserting file records...");
    const realFileId = await insertFileRecord(
      realImagePublicUrl,
      "real",
      null,
      null
    );
    const generatedFileId = await insertFileRecord(
      generatedImagePublicUrl,
      "generated",
      modelId,
      prompt
    );

    console.log("\n=== Success! ===");
    console.log("Real file ID:", realFileId);
    console.log("Generated file ID:", generatedFileId);
    console.log("Prompt:", prompt);

    return {
      realFileId,
      generatedFileId,
      prompt,
    };
  } catch (error) {
    console.error("Error processing image pair:", error);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const imageUrl = process.argv[2];

  if (!imageUrl) {
    console.error("Usage: npx tsx scripts/add-image-pair.ts <image-url>");
    process.exit(1);
  }

  processImagePair(imageUrl)
    .then((result) => {
      console.log("\nResult:", JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed:", error);
      process.exit(1);
    });
}
