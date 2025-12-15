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
from typing import Optional, Dict, List
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random

# Load environment variables
load_dotenv(dotenv_path=".env.local")

import requests
from google import genai
from google.genai import types
from PIL import Image
from supabase import create_client, Client
import pickle
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import re

# Available Unsplash categories for scraping
AVAILABLE_CATEGORIES = [
    "people",
    "animals",
    "nature",
    "architecture",
    "travel",
    "street-photography"
]

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

def get_existing_urls_from_database() -> set:
    """
    Fetch all existing image URLs from the database.
    
    Returns:
        Set of URLs that already exist in the database
    """
    print("Fetching existing URLs from database...")
    try:
        # Query all files with source_type='real' to get existing image URLs
        response = supabase.table("files").select("url").eq("source_type", "real").execute()
        
        if response.data:
            existing_urls = {record["url"] for record in response.data}
            print(f"Found {len(existing_urls)} existing URLs in database")
            return existing_urls
        else:
            print("No existing URLs found in database")
            return set()
    except Exception as e:
        print(f"Warning: Could not fetch existing URLs from database: {e}")
        print("Continuing without duplicate checking...")
        return set()


def scrape_unsplash_category(category_url: str, max_images: int = 20, check_database: bool = True) -> List[str]:
    """
    Scrape Unsplash category page for FREE image URLs only (excludes Unsplash+ images and duplicates).
    
    Args:
        category_url: The URL of the Unsplash category page (e.g., https://unsplash.com/t/people)
        max_images: Maximum number of NEW image URLs to return
        check_database: Whether to check for existing URLs in the database (default: True)
    
    Returns:
        List of high-quality image URLs from Unsplash (free images only, not in database)
    """
    print(f"\nScraping Unsplash category: {category_url}")
    print(f"Looking for up to {max_images} FREE images (excluding Unsplash+ and duplicates)...")
    
    # Fetch existing URLs from database once at the start
    existing_urls = set()
    if check_database:
        existing_urls = get_existing_urls_from_database()
    
    # Set up Selenium with headless Chrome
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    driver = webdriver.Chrome(options=chrome_options)
    image_urls = set()
    skipped_plus = 0
    skipped_duplicates = 0
    
    try:
        driver.get(category_url)
        
        # Wait for images to load
        print("Waiting for page to load...")
        time.sleep(3)
        
        # Scroll to load more images
        scroll_count = 0
        max_scrolls = 15  # Increased to account for skipping Unsplash+ images and duplicates
        
        while scroll_count < max_scrolls and len(image_urls) < max_images:
            # Scroll down
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            scroll_count += 1
            
            # Get page source and parse with BeautifulSoup
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # Find all image elements
            # Unsplash uses img tags with srcset attributes
            img_elements = soup.find_all('img', {'srcset': True})
            
            for img in img_elements:
                srcset = img.get('srcset', '')
                
                # Extract the highest quality URL from srcset
                # srcset format: "url1 400w, url2 800w, url3 1200w"
                urls = re.findall(r'(https://[^\s]+)\s+\d+w', srcset)
                
                if urls:
                    url = urls[0]

                    # Skip Unsplash+ images
                    if 'plus.unsplash.com' in url or 'premium_photo' in url:
                        skipped_plus += 1
                        continue
                    
                    # Clean up the URL (remove any size parameters and add raw parameter for highest quality)
                    if 'images.unsplash.com' in url:
                        url = url.split('?')[0]
                        
                        # Check if URL is already in our list or in the database
                        if url in image_urls:
                            continue  # Already in current batch
                        
                        if url in existing_urls:
                            skipped_duplicates += 1
                            continue  # Already in database
                        
                        # New image found!
                        image_urls.add(url)
                        print(f"Found NEW image {len(image_urls)}: {url}")
                        
                        if len(image_urls) >= max_images:
                            break
            
            print(f"Scroll {scroll_count}/{max_scrolls}: {len(image_urls)} new images (skipped {skipped_plus} Unsplash+, {skipped_duplicates} duplicates)")
        
        print(f"\n✓ Successfully scraped {len(image_urls)} NEW image URLs")
        print(f"✗ Skipped {skipped_plus} Unsplash+ (paid) images")
        print(f"✗ Skipped {skipped_duplicates} duplicate images (already in database)")
        
        if len(image_urls) < max_images:
            print(f"⚠️  Warning: Only found {len(image_urls)}/{max_images} new images after {scroll_count} scrolls")
            print(f"   Consider trying a different category or clearing old images from database")
        
        return list(image_urls)[:max_images]
    
    except Exception as e:
        print(f"Error scraping Unsplash: {e}")
        raise
    
    finally:
        driver.quit()


def scrape_multiple_categories(categories: List[str], images_per_category: int = 10) -> Dict[str, List[str]]:
    """
    Scrape multiple Unsplash categories.
    
    Args:
        categories: List of category names (e.g., ['people', 'animals', 'nature'])
        images_per_category: Number of images to scrape from each category
    
    Returns:
        Dictionary mapping category names to lists of image URLs
    """
    results = {}
    
    for category in categories:
        category_url = f"https://unsplash.com/t/{category}"
        try:
            image_urls = scrape_unsplash_category(category_url, images_per_category)
            results[category] = image_urls
            print(f"\n✓ Scraped {len(image_urls)} images from '{category}' category\n")
        except Exception as e:
            print(f"\n✗ Failed to scrape '{category}' category: {e}\n")
            results[category] = []
    
    return results


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
Use some creativity to describe a scene that's similar to the original image but not the same. Keep it realistic. For example, change the main subject or main object of the image.
Mention the editing style of the image as well as other photographic elements that are present in the image, such as lighting, composition, camera angle, lens type, etc.

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


def get_or_create_game(game_date: str) -> str:
    """
    Get or create a game for a specific date and return the ID.
    
    Args:
        game_date: Date string in format 'YYYY-MM-DD'
    
    Returns:
        Game ID
    """
    print(f"Getting/creating game for date: {game_date}")
    
    # Check if game exists for this date
    response = supabase.table("games").select("id").eq("date", game_date).execute()
    
    if response.data and len(response.data) > 0:
        game_id = response.data[0]["id"]
        print(f"Game already exists: {game_id}")
        return game_id
    
    # Create new game
    response = supabase.table("games").insert({"date": game_date}).execute()
    
    if not response.data or len(response.data) == 0:
        raise Exception(f"Failed to create game for date {game_date}")
    
    game_id = response.data[0]["id"]
    print(f"Created new game: {game_id}")
    return game_id


def create_file_pair(real_file_id: str, generated_file_id: str, game_id: str) -> str:
    """
    Create a file pair linking real and generated images to a game.
    
    Args:
        real_file_id: ID of the real image file
        generated_file_id: ID of the generated image file
        game_id: ID of the game this pair belongs to
    
    Returns:
        File pair ID
    """
    print(f"Creating file pair for game {game_id}")
    
    data = {
        "real_file_id": real_file_id,
        "generated_file_id": generated_file_id,
        "game_id": game_id,
        "real_vote_count": 0,
        "generated_vote_count": 0,
    }
    
    response = supabase.table("file_pairs").insert(data).execute()
    
    if not response.data or len(response.data) == 0:
        raise Exception("Failed to create file pair")
    
    file_pair_id = response.data[0]["id"]
    print(f"Created file pair: {file_pair_id}")
    return file_pair_id


def get_week_dates(days_ahead: int = 2, num_days: int = 7) -> List[str]:
    """
    Generate a list of dates for the game week.
    
    Args:
        days_ahead: Number of days in the future to start (default: 2)
        num_days: Number of days to generate (default: 7)
    
    Returns:
        List of date strings in format 'YYYY-MM-DD'
    """
    start_date = datetime.now() + timedelta(days=days_ahead)
    dates = []
    
    for i in range(num_days):
        date = start_date + timedelta(days=i)
        dates.append(date.strftime('%Y-%m-%d'))
    
    return dates


def scrape_images_from_random_categories(total_needed: int) -> List[str]:
    """
    Scrape images from random categories until we have enough.
    
    Args:
        total_needed: Total number of images needed
    
    Returns:
        List of image URLs
    
    Raises:
        Exception if not enough images can be found
    """
    # Randomly select categories to scrape from
    categories = AVAILABLE_CATEGORIES.copy()
    random.shuffle(categories)
    
    all_image_urls = []
    used_categories = []
    
    for category in categories:
        category_url = f"https://unsplash.com/t/{category}"
        print(f"\n--- Scraping category: {category} ---")
        try:
            # Calculate how many more images we need
            images_needed = total_needed - len(all_image_urls)
            
            # Scrape images from this category
            urls = scrape_unsplash_category(
                category_url, 
                max_images=images_needed
            )
            
            if len(urls) > 0:
                all_image_urls.extend(urls)
                used_categories.append(category)
                print(f"✓ Added {len(urls)} images from '{category}' (total: {len(all_image_urls)}/{total_needed})")
            else:
                print(f"⚠️  No new images found in '{category}'")
            
            # Stop if we have enough
            if len(all_image_urls) >= total_needed:
                print(f"\n✓ Collected enough images ({len(all_image_urls)})!")
                break
        except Exception as e:
            print(f"✗ Failed to scrape '{category}': {e}")
    
    print(f"\nCategories used: {', '.join(used_categories)}")
    
    if len(all_image_urls) < total_needed:
        print(f"\n❌ ERROR: Not enough images found!")
        print(f"   Required: {total_needed} images")
        print(f"   Found: {len(all_image_urls)} images")
        print(f"\nThis usually means:")
        print(f"   • Many images are already in the database")
        print(f"   • Categories don't have enough free (non-Unsplash+) images")
        print(f"\nSuggestions:")
        print(f"   • Try running again later")
        print(f"   • Reduce the number of images per day")
        print(f"   • Clear old images from the database")
        raise Exception(f"Not enough images: needed {total_needed}, found {len(all_image_urls)}")
    
    # Trim to exact number needed
    return all_image_urls[:total_needed]


def process_images_for_game(game_date: str, image_urls: List[str]) -> Dict[str, any]:
    """
    Process images and create file pairs for a specific game date.
    
    Args:
        game_date: Date string in format 'YYYY-MM-DD'
        image_urls: List of image URLs to process
    
    Returns:
        Dictionary with game_id, processed_count, and failed_count
    """
    print(f"\n{'='*60}")
    print(f"  PROCESSING IMAGES FOR {game_date}")
    print(f"{'='*60}\n")
    
    # Create or get game for this date
    try:
        game_id = get_or_create_game(game_date)
    except Exception as e:
        raise Exception(f"Failed to create game for {game_date}: {e}")
    
    # Process images
    processed_count = 0
    failed_count = 0
    
    for img_idx, url in enumerate(image_urls, 1):
        print(f"\n[Image {img_idx}/{len(image_urls)}] {url}")
        try:
            result = process_image_pair(url, game_id=game_id)
            processed_count += 1
            print(f"✓ Success - Pair {result['filePairId']}")
        except Exception as error:
            failed_count += 1
            print(f"✗ Failed: {error}")
        
        # Small delay to avoid rate limiting
        if img_idx < len(image_urls):
            time.sleep(2)
    
    return {
        "game_id": game_id,
        "processed_count": processed_count,
        "failed_count": failed_count,
    }


def process_image_pair(real_image_url: str, game_id: Optional[str] = None) -> Dict[str, str]:
    """
    Process an image pair: download real image, generate description,
    create AI image, upload both to Vercel Blob, and create database records.
    
    Args:
        real_image_url: URL of the real image to process
        game_id: Optional game ID to associate this pair with
    
    Returns a dict with realFileId, generatedFileId, prompt, and optionally filePairId.
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
        # prompt = "testing"
        
        # Step 3: Generate AI image with Gemini 2.5 Flash Image
        print("\n3. Generating AI image...")
        generated_image_bytes = generate_image_with_imagen(prompt)
        # generated_image_bytes = real_image_bytes
        
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
        
        result = {
            "realFileId": real_file_id,
            "generatedFileId": generated_file_id,
            "prompt": prompt,
        }
        
        # Step 7: Create file pair if game_id is provided
        if game_id:
            print(f"\n7. Creating file pair for game {game_id}...")
            file_pair_id = create_file_pair(real_file_id, generated_file_id, game_id)
            result["filePairId"] = file_pair_id
        
        print("\n=== Success! ===")
        print(f"Real file ID: {real_file_id}")
        print(f"Generated file ID: {generated_file_id}")
        print(f"Prompt: {prompt}")
        if game_id:
            print(f"File pair ID: {result['filePairId']}")
        
        return result
    
    except Exception as error:
        print(f"Error processing image pair: {error}")
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  1. Process a single image URL:")
        print("     python scripts/image.py <image-url>")
        print("\n  2. Scrape Unsplash categories:")
        print("     python scripts/image.py --scrape <category1> <category2> ... [--count N]")
        print("\n  3. Scrape and process images:")
        print("     python scripts/image.py --scrape-and-process <category1> <category2> ... [--count N]")
        print("\n  4. Create a week of games (recommended):")
        print("     python scripts/image.py --create-week [--per-day N] [--start-offset N]")
        print("\n  5. Create a single day:")
        print("     python scripts/image.py --create-day <YYYY-MM-DD> [--count N]")
        print("\nExamples:")
        print("  python scripts/image.py https://example.com/image.jpg")
        print("  python scripts/image.py --scrape people animals nature --count 5")
        print("  python scripts/image.py --scrape-and-process people animals --count 3")
        print("  python scripts/image.py --create-week --per-day 10 --start-offset 2")
        print("  python scripts/image.py --create-day 2025-12-25 --count 10")
        sys.exit(1)
    
    mode = sys.argv[1]
    
    # Mode 1: Process a single image URL
    if not mode.startswith("--"):
        image_url = mode
        try:
            result = process_image_pair(image_url)
            print("\n=== Result ===")   
            print(f"  Real File ID: {result['realFileId']}")
            print(f"  Generated File ID: {result['generatedFileId']}")
            print(f"  Prompt: {result['prompt']}")
            sys.exit(0)
        except Exception as error:
            print(f"Failed: {error}")
            sys.exit(1)
    
    # Mode 2 & 3: Scrape Unsplash
    elif mode in ["--scrape", "--scrape-and-process"]:
        categories = ["people", "animals", "nature", "architecture-interior", "travel", "street-photography"]
        # Parse arguments
        categories = []
        images_per_category = 10  # default
        
        i = 2
        while i < len(sys.argv):
            if sys.argv[i] == "--count" and i + 1 < len(sys.argv):
                images_per_category = int(sys.argv[i + 1])
                i += 2
            else:
                categories.append(sys.argv[i])
                i += 1
        
        if not categories:
            print("Error: Please specify at least one category to scrape")
            print("Example: python scripts/image.py --scrape people animals --count 5")
            sys.exit(1)
        
        print(f"\n=== Scraping {len(categories)} categories ===")
        print(f"Categories: {', '.join(categories)}")
        print(f"Images per category: {images_per_category}\n")
        
        try:
            results = scrape_multiple_categories(categories, images_per_category)
            
            # Print summary
            print("\n=== Scraping Complete ===")
            total_images = 0
            for category, urls in results.items():
                print(f"{category}: {len(urls)} images")
                total_images += len(urls)
            print(f"Total: {total_images} images\n")
            
            # If --scrape-and-process, process each image
            if mode == "--scrape-and-process":
                print("\n=== Processing Images ===")
                processed_count = 0
                failed_count = 0
                
                for category, urls in results.items():
                    print(f"\nProcessing images from '{category}' category...")
                    for idx, url in enumerate(urls, 1):
                        print(f"\n[{category} {idx}/{len(urls)}] Processing: {url}")
                        try:
                            result = process_image_pair(url)
                            processed_count += 1
                            print(f"✓ Success - Real: {result['realFileId']}, Generated: {result['generatedFileId']}")
                        except Exception as error:
                            failed_count += 1
                            print(f"✗ Failed: {error}")
                        
                        # Add a small delay to avoid rate limiting
                        if idx < len(urls):
                            time.sleep(2)
                
                print(f"\n=== Processing Complete ===")
                print(f"Successfully processed: {processed_count}")
                print(f"Failed: {failed_count}")
            else:
                # Just print the URLs
                print("Image URLs:")
                for category, urls in results.items():
                    print(f"\n{category.upper()}:")
                    for url in urls:
                        print(f"  {url}")
            
            sys.exit(0)
        except Exception as error:
            print(f"Failed: {error}")
            sys.exit(1)
    
    # Mode 4: Create a week of games
    elif mode == "--create-week":
        # Parse arguments
        images_per_day = 10  # default
        start_offset = 2  # default: start 2 days from now
        
        i = 2
        while i < len(sys.argv):
            if sys.argv[i] == "--per-day" and i + 1 < len(sys.argv):
                images_per_day = int(sys.argv[i + 1])
                i += 2
            elif sys.argv[i] == "--start-offset" and i + 1 < len(sys.argv):
                start_offset = int(sys.argv[i + 1])
                i += 2
            else:
                print(f"Warning: Unknown argument '{sys.argv[i]}' - ignoring")
                i += 1
        
        # Randomly select categories to scrape from
        # We'll shuffle and try categories until we have enough images
        categories = AVAILABLE_CATEGORIES.copy()
        random.shuffle(categories)
        
        try:
            # Generate dates for the week
            week_dates = get_week_dates(days_ahead=start_offset, num_days=7)
            
            print(f"\n{'='*60}")
            print(f"  CREATING WEEKLY GAME SCHEDULE")
            print(f"{'='*60}")
            print(f"Available categories: {', '.join(AVAILABLE_CATEGORIES)}")
            print(f"Images per day: {images_per_day}")
            print(f"Start date: {week_dates[0]}")
            print(f"End date: {week_dates[-1]}")
            print(f"{'='*60}\n")
            
            total_images_needed = 7 * images_per_day
            print(f"Total images needed: {total_images_needed}")
            print(f"Will randomly scrape from categories until {total_images_needed} images found...\n")
            
            # Scrape all images needed for the week
            all_image_urls = scrape_images_from_random_categories(total_images_needed)
            
            print(f"\n{'='*60}")
            print(f"  PROCESSING IMAGES AND CREATING GAMES")
            print(f"{'='*60}\n")
            
            # Process images day by day
            total_processed = 0
            total_failed = 0
            
            for day_idx, game_date in enumerate(week_dates, 1):
                print(f"\n{'─'*60}")
                print(f"  DAY {day_idx}/7 - {game_date}")
                print(f"{'─'*60}")
                
                # Get images for this day
                start_idx = (day_idx - 1) * images_per_day
                end_idx = start_idx + images_per_day
                day_urls = all_image_urls[start_idx:end_idx]
                
                # Process images for this day
                try:
                    result = process_images_for_game(game_date, day_urls)
                    total_processed += result["processed_count"]
                    total_failed += result["failed_count"]
                except Exception as e:
                    print(f"✗ Failed to process day {game_date}: {e}")
                    total_failed += len(day_urls)
            
            print(f"\n{'='*60}")
            print(f"  WEEKLY SCHEDULE COMPLETE!")
            print(f"{'='*60}")
            print(f"Successfully processed: {total_processed}/{total_images_needed}")
            print(f"Failed: {total_failed}")
            print(f"\nGames created for:")
            for date in week_dates:
                print(f"  • {date}")
            print(f"{'='*60}\n")
            
            sys.exit(0)
        except Exception as error:
            print(f"\n❌ Failed: {error}")
            sys.exit(1)
    
    # Mode 5: Create a single day
    elif mode == "--create-day":
        if len(sys.argv) < 3:
            print("Error: Please specify a date")
            print("Example: python scripts/image.py --create-day 2025-12-25 --count 10")
            sys.exit(1)
        
        game_date = sys.argv[2]
        
        # Validate date format
        try:
            datetime.strptime(game_date, '%Y-%m-%d')
        except ValueError:
            print(f"Error: Invalid date format '{game_date}'")
            print("Please use YYYY-MM-DD format (e.g., 2025-12-25)")
            sys.exit(1)
        
        # Parse arguments
        image_count = 10  # default
        
        i = 3
        while i < len(sys.argv):
            if sys.argv[i] == "--count" and i + 1 < len(sys.argv):
                image_count = int(sys.argv[i + 1])
                i += 2
            else:
                print(f"Warning: Unknown argument '{sys.argv[i]}' - ignoring")
                i += 1
        
        try:
            print(f"\n{'='*60}")
            print(f"  CREATING GAME FOR {game_date}")
            print(f"{'='*60}")
            print(f"Available categories: {', '.join(AVAILABLE_CATEGORIES)}")
            print(f"Images needed: {image_count}")
            print(f"{'='*60}\n")
            
            # Scrape images
            image_urls = scrape_images_from_random_categories(image_count)
            
            # Process images and create game
            result = process_images_for_game(game_date, image_urls)
            
            print(f"\n{'='*60}")
            print(f"  GAME CREATION COMPLETE!")
            print(f"{'='*60}")
            print(f"Date: {game_date}")
            print(f"Successfully processed: {result['processed_count']}/{image_count}")
            print(f"Failed: {result['failed_count']}")
            print(f"Game ID: {result['game_id']}")
            print(f"{'='*60}\n")
            
            sys.exit(0)
        except Exception as error:
            print(f"\n❌ Failed: {error}")
            sys.exit(1)
    
    else:
        print(f"Unknown mode: {mode}")
        print("Use --scrape, --scrape-and-process, --create-week, --create-day, or provide an image URL")
        sys.exit(1)
