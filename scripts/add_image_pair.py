#!/usr/bin/env python3
"""
Script to generate image pairs for the Truth or Banana game.

Usage:
    python scripts/add_image_pair.py <real-image-url>

Steps:
1. Download the real image from the provided URL
2. Use Gemini Vision to generate a description of the image
3. Use Gemini 2.5 Flash Image to generate an AI image based on the description
4. Upload both images to Vercel Blob Storage
5. Create database records for both images in Supabase
"""

import os
import sys
import base64
import time
from io import BytesIO
from typing import Optional, Dict
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=".env.local")

import requests
from google import genai
from google.genai import types
from PIL import Image
from supabase import create_client, Client
import pickle

# Initialize clients
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BLOB_READ_WRITE_TOKEN = os.getenv("BLOB_READ_WRITE_TOKEN")

if not GEMINI_API_KEY or not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY or not BLOB_READ_WRITE_TOKEN:
    print("Error: Missing required environment variables")
    print("Please ensure GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and BLOB_READ_WRITE_TOKEN are set in .env.local")
    sys.exit(1)

gemini_client = genai.Client(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def download_image(url: str) -> bytes:
    """Download an image from a URL and return as bytes."""
    print(f"Downloading image from {url}...")
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Failed to download image: {response.status_code}")
    return response.content


def generate_image_description(image_url: str) -> str:
    """Use Gemini Vision to generate a description of the image."""
    print("Generating description with Gemini Vision...")
    
    # Download the image
    image_bytes = download_image(image_url)
    
    # Convert to base64 for Gemini API
    base64_image = base64.b64encode(image_bytes).decode('utf-8')
    
    prompt = """Describe this image in a few sentences.
    
Capture the general lighting style and emotional atmosphere.
Generalize the setting (e.g., use 'a coastal scene' instead of describing this specific beach).
Use some creativity to describe a scene that's similar to the original image but not the same. Keep it realistic.
Use natural, documentary-style elements to describe the image, rather than extremely saturated, vibrant, intense, etc. It should be a realistic description and capture the image but not overdramatize it.

However, make the prompt cohesive and consistent. Do not contradict yourself. This prompt will be used to generate a new image with the goal of tricking the user into thinking it's a real image.
    """
    
    # Use Gemini Vision (flash model for cost-effectiveness)
    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64_image
                        }
                    }
                ]
            }
        ]
    )
    
    description = response.text
    print(f"Generated description: {description}")
    return description.strip()


def generate_image_with_imagen(description: str) -> bytes:
    """Generate an AI image using Gemini 2.5 Flash Image based on the description."""
    print("Generating AI image with Gemini 2.5 Flash Image...")
    
    prompt = f"Generate an image that matches the following description: {description}"
    
    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        config=types.GenerateContentConfig(
          response_modalities=['IMAGE'],
          image_config=types.ImageConfig(
            aspect_ratio="4:3"
          )
        )
      )

    # Save the response in pickle
    with open("response.pkl", "wb") as f:
        pickle.dump(response, f)

    # # Load the response from pickle
    # with open("response.pkl", "rb") as f:
    #     response = pickle.load(f)
    
    # Extract the image bytes from the response
    for part in response.parts:
        if part.text is not None:
            print(part.text)
        elif image := part.as_image():
            print("AI image generated successfully")
            
            # Convert PIL Image to bytes for upload
            image_bytes = image.image_bytes
            return image_bytes
    
    raise Exception("No images generated")


def upload_to_vercel_blob(image_bytes: bytes, filename: str) -> str:
    """Upload an image to Vercel Blob Storage and return the public URL."""
    print(f"Uploading {filename} to Vercel Blob storage...")
    
    # Upload to Vercel Blob Storage
    response = requests.put(
        f"https://blob.vercel-storage.com/{filename}",
        headers={
            "Authorization": f"Bearer {BLOB_READ_WRITE_TOKEN}",
            "Content-Type": "image/jpeg",
            "x-content-type": "image/jpeg"
        },
        data=image_bytes
    )
    
    if response.status_code not in (200, 201):
        raise Exception(f"Failed to upload to Vercel Blob: {response.status_code} - {response.text}")
    
    # Parse response to get public URL
    response_data = response.json()
    public_url = response_data.get("url")
    
    if not public_url:
        raise Exception("No URL returned from Vercel Blob")
    
    print(f"Uploaded to: {public_url}")
    return public_url


def insert_file_record(
    url: str,
    source_type: str,
    source_id: Optional[str],
    prompt: Optional[str]
) -> str:
    """Insert a file record into the database and return the ID."""
    print(f"Inserting {source_type} file record...")
    
    data = {
        "url": url,
        "source_type": source_type,
        "source_id": source_id,
        "prompt": prompt,
    }
    
    response = supabase.table("files").insert(data).execute()
    
    if not response.data or len(response.data) == 0:
        raise Exception("Failed to insert file record")
    
    file_id = response.data[0]["id"]
    print(f"Created file record: {file_id}")
    return file_id


def get_or_create_model(model_name: str) -> str:
    """Get or create a model record and return the ID."""
    # Check if model exists
    response = supabase.table("models").select("id").eq("name", model_name).execute()
    
    if response.data and len(response.data) > 0:
        return response.data[0]["id"]
    
    # Create new model
    response = supabase.table("models").insert({"name": model_name}).execute()
    
    if not response.data or len(response.data) == 0:
        raise Exception("Failed to create model record")
    
    return response.data[0]["id"]


def process_image_pair(real_image_url: str) -> Dict[str, str]:
    """
    Process an image pair: download real image, generate description,
    create AI image, upload both to Vercel Blob, and create database records.
    
    Returns a dict with realFileId, generatedFileId, and prompt.
    """
    try:
        print("\n=== Processing Image Pair ===")
        print(f"Real image URL: {real_image_url}")
        
        # Step 1: Download real image
        print("\n1. Downloading real image...")
        real_image_bytes = download_image(real_image_url)
        
        # Step 2: Generate description with Gemini
        print("\n2. Generating description with Gemini...")
        prompt = generate_image_description(real_image_url)
        
        # Step 3: Generate AI image with Gemini 2.5 Flash Image
        print("\n3. Generating AI image...")
        generated_image_bytes = generate_image_with_imagen(prompt)
        
        # Step 4: Upload both images to Vercel Blob Storage
        print("\n4. Uploading images to Vercel Blob...")
        timestamp = int(time.time() * 1000)
        generated_image_filename = f"generated-{timestamp}.jpg"
        
        generated_image_public_url = upload_to_vercel_blob(
            generated_image_bytes, generated_image_filename
        )
        
        # Step 5: Get or create model record
        print("\n5. Creating model record...")
        model_id = get_or_create_model("Gemini 2.5 Flash Image")
        
        # Step 6: Insert file records
        print("\n6. Inserting file records...")
        real_file_id = insert_file_record(
            real_image_url, "real", None, None
        )
        generated_file_id = insert_file_record(
            generated_image_public_url, "generated", model_id, prompt
        )
        
        print("\n=== Success! ===")
        print(f"Real file ID: {real_file_id}")
        print(f"Generated file ID: {generated_file_id}")
        print(f"Prompt: {prompt}")
        
        return {
            "realFileId": real_file_id,
            "generatedFileId": generated_file_id,
            "prompt": prompt,
        }
    
    except Exception as error:
        print(f"Error processing image pair: {error}")
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/add_image_pair.py <image-url>")
        sys.exit(1)
    
    image_url = sys.argv[1]
    
    try:
        result = process_image_pair(image_url)
        print("\nResult:")
        print(f"  Real File ID: {result['realFileId']}")
        print(f"  Generated File ID: {result['generatedFileId']}")
        print(f"  Prompt: {result['prompt']}")
        sys.exit(0)
    except Exception as error:
        print(f"Failed: {error}")
        sys.exit(1)
