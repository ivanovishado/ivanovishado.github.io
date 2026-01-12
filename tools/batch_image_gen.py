#!/usr/bin/env python3
"""
Batch Image Generation Script using Gemini API.

This script allows you to:
1. Generate multiple images in batch (4 at a time) for rapid iteration
2. Focus on a single prompt to refine one image

Usage:
    # Generate 4 images from prompts in batch mode
    python batch_image_gen.py --mode batch

    # Generate a single image
    python batch_image_gen.py --mode single --prompt "Your detailed prompt here"

    # Check status of an existing batch job
    python batch_image_gen.py --mode status --job-name "batches/your-job-id"

Environment:
    Set GEMINI_API_KEY environment variable or create a .env file with:
    GEMINI_API_KEY=your_api_key_here
"""

import argparse
import base64
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Error: google-genai package not found.")
    print("Install it with: pip install google-genai")
    sys.exit(1)

try:
    from PIL import Image
    import io
except ImportError:
    print("Warning: Pillow not found. Install with: pip install Pillow")
    Image = None

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional

# Configuration
OUTPUT_DIR = Path(__file__).parent / "generated_images"

# Supported models
MODELS = {
    "flash": "gemini-2.5-flash-image",
    "pro": "gemini-3-pro-image-preview",
}
DEFAULT_MODEL = "pro"

# Supported aspect ratios
ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"]
DEFAULT_ASPECT_RATIO = "16:9"

# Supported resolutions (only for 'pro' model)
RESOLUTIONS = ["1K", "2K", "4K"]
DEFAULT_RESOLUTION = "1K"

# Default prompts for batch mode - Edit these to iterate on your UI designs!
DEFAULT_BATCH_PROMPTS = [
    """A futuristic cyberpunk-style personal portfolio website hero section. 
    Dark theme with neon indigo and cyan accents. Shows a 3D floating astronaut 
    figure with holographic UI elements. Tech-inspired typography reading 
    "IVAN GALAVIZ - SOFTWARE ENGINEER". Glassmorphism cards with subtle gradients.
    4K resolution, highly detailed, modern web design aesthetic.""",
    
    """A sci-fi themed "Flight Logs" section of a portfolio website. 
    Features mission-style data readouts with monospace fonts. 
    Shows tabs for different projects like "MISSE-FF" and "SAMARA-CS". 
    Dark space background with glowing cyan borders and data visualization elements.
    Event Horizon design system aesthetic with indigo primary color.""",
    
    """A terminal-style chat interface embedded in a portfolio website.
    Green/cyan text on dark background. Command-line aesthetic with 
    blinking cursor. Shows AI assistant conversation about the developer's 
    experience. Retro CRT monitor glow effect. "COMMS RELAY" header in 
    pixelated sci-fi font.""",
    
    """A modern skills/technologies section for a developer portfolio.
    Dark theme with floating 3D icons for Python, Go, TypeScript, AWS, etc.
    Glassmorphism cards with subtle hover states. Neon accent lighting.
    Clean grid layout with animated skill bars. Space-themed background.""",
]


def get_client():
    """Initialize and return the Gemini client."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set.")
        print("Set it with: export GEMINI_API_KEY=your_key_here")
        print("Or create a .env file with: GEMINI_API_KEY=your_key_here")
        sys.exit(1)
    
    return genai.Client(api_key=api_key)


def ensure_output_dir():
    """Create output directory if it doesn't exist."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR


def generate_single_image(client, prompt: str, output_name: str = None, aspect_ratio: str = None, model: str = None, resolution: str = None, reference_images: list = None):
    """
    Generate a single image using the standard API (not batch).
    This is faster for iteration on a single prompt.
    
    Args:
        reference_images: Optional list of paths to reference images (up to 5).
    """
    ar = aspect_ratio or DEFAULT_ASPECT_RATIO
    model_key = model or DEFAULT_MODEL
    model_name = MODELS[model_key]
    res = resolution or DEFAULT_RESOLUTION
    ref_images = reference_images or []
    
    # Limit to 5 reference images
    if len(ref_images) > 5:
        print(f"⚠️  Only 5 reference images supported, using first 5 of {len(ref_images)}")
        ref_images = ref_images[:5]
    
    print(f"\n🎨 Generating single image...")
    print(f"🤖 Model: {model_key} ({model_name})")
    print(f"📐 Aspect ratio: {ar}")
    if model_key == "pro":
        print(f"📷 Resolution: {res}")
    if ref_images:
        print(f"🖼️  Reference images: {len(ref_images)}")
        for img_path in ref_images:
            print(f"    - {img_path}")
    print(f"📝 Prompt: {prompt[:100]}..." if len(prompt) > 100 else f"📝 Prompt: {prompt}")
    
    try:
        # Build image config based on model
        if model_key == "pro":
            image_cfg = types.ImageConfig(
                aspect_ratio=ar,
                image_size=res
            )
        else:
            image_cfg = types.ImageConfig(
                aspect_ratio=ar
            )
        
        # Build contents with optional reference images
        contents = [prompt]
        if ref_images and Image:
            for img_path in ref_images:
                ref_img = Image.open(img_path)
                contents.append(ref_img)
                print(f"✅ Loaded: {img_path} ({ref_img.size[0]}x{ref_img.size[1]})")
        
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=image_cfg
            )
        )
        
        output_dir = ensure_output_dir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        for i, part in enumerate(response.parts):
            if part.text is not None:
                print(f"📄 Model response: {part.text}")
            elif part.inline_data is not None:
                if output_name:
                    filename = f"{output_name}_{timestamp}.png"
                else:
                    filename = f"single_{timestamp}_{i}.png"
                
                filepath = output_dir / filename
                
                if Image:
                    image = part.as_image()
                    image.save(filepath)
                else:
                    # Fallback: save raw bytes
                    with open(filepath, "wb") as f:
                        f.write(base64.b64decode(part.inline_data.data))
                
                print(f"✅ Saved: {filepath}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error generating image: {e}")
        return False


def create_batch_job(client, prompts: list[str], job_name: str = None, aspect_ratio: str = None, model: str = None, resolution: str = None, reference_images: list = None):
    """
    Create a batch job for generating multiple images.
    Uses JSONL file upload method which supports generation_config for images.
    Returns the job name for status tracking.
    
    Args:
        reference_images: Optional list of paths to reference images (up to 5). Will be uploaded and referenced in all batch requests.
    """
    ar = aspect_ratio or DEFAULT_ASPECT_RATIO
    model_key = model or DEFAULT_MODEL
    model_name = MODELS[model_key]
    res = resolution or DEFAULT_RESOLUTION
    ref_images = reference_images or []
    
    # Limit to 5 reference images
    if len(ref_images) > 5:
        print(f"⚠️  Only 5 reference images supported, using first 5 of {len(ref_images)}")
        ref_images = ref_images[:5]
    
    print(f"\n📦 Creating batch job with {len(prompts)} prompts...")
    print(f"🤖 Model: {model_key} ({model_name})")
    print(f"📐 Aspect ratio: {ar}")
    if model_key == "pro":
        print(f"📷 Resolution: {res}")
    if ref_images:
        print(f"🖼️  Reference images: {len(ref_images)}")
        for img_path in ref_images:
            print(f"    - {img_path}")
    
    # Create temporary JSONL file with requests
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    temp_dir = ensure_output_dir()
    jsonl_file = temp_dir / f"batch_requests_{timestamp}.jsonl"
    
    # Mime type mapping
    mime_types = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    
    # Upload reference images if provided
    uploaded_refs = []  # List of (uri, mime_type) tuples
    if ref_images:
        print(f"📤 Uploading {len(ref_images)} reference image(s)...")
        for idx, img_path in enumerate(ref_images):
            try:
                ref_path = Path(img_path)
                ext = ref_path.suffix.lower()
                ref_mime_type = mime_types.get(ext, 'image/png')
                
                uploaded_ref = client.files.upload(
                    file=str(ref_path),
                    config=types.UploadFileConfig(
                        display_name=f"ref-image-{timestamp}-{idx}",
                        mime_type=ref_mime_type
                    )
                )
                uploaded_refs.append((uploaded_ref.uri, ref_mime_type))
                print(f"  ✅ Uploaded: {ref_path.name} -> {uploaded_ref.name}")
            except Exception as e:
                print(f"  ⚠️  Failed to upload {img_path}: {e}")
    
    try:
        # Build generation_config with imageConfig inside (matching REST API format)
        if model_key == "pro":
            gen_config = {
                "responseModalities": ["TEXT", "IMAGE"],
                "imageConfig": {
                    "aspectRatio": ar,
                    "imageSize": res
                }
            }
        else:
            gen_config = {
                "responseModalities": ["TEXT", "IMAGE"],
                "imageConfig": {
                    "aspectRatio": ar
                }
            }
        
        # Write requests to JSONL file
        with open(jsonl_file, "w", encoding="utf-8") as f:
            for i, prompt in enumerate(prompts):
                # Build parts list
                parts = [{"text": prompt}]
                
                # Add all reference images
                for ref_uri, ref_mime in uploaded_refs:
                    parts.append({
                        "fileData": {
                            "fileUri": ref_uri,
                            "mimeType": ref_mime
                        }
                    })
                
                request = {
                    "key": f"request-{i+1}",
                    "request": {
                        "contents": [{
                            "parts": parts
                        }],
                        "generation_config": gen_config
                    }
                }
                f.write(json.dumps(request) + "\n")
                truncated = f"{prompt[:60]}..." if len(prompt) > 60 else prompt
                print(f"  📝 Prompt {i+1}: {truncated}")
        
        print(f"\n📄 Created JSONL file: {jsonl_file}")
        
        # Upload the file
        print("📤 Uploading file to Gemini...")
        uploaded_file = client.files.upload(
            file=str(jsonl_file),
            config=types.UploadFileConfig(
                display_name=f"batch-image-requests-{timestamp}",
                mime_type="application/jsonl"
            )
        )
        print(f"✅ Uploaded: {uploaded_file.name}")
        
        # Create batch job
        display_name = job_name or f"ui-mockups-{timestamp}"
        
        batch_job = client.batches.create(
            model=model_name,
            src=uploaded_file.name,
            config={
                'display_name': display_name,
            },
        )
        
        print(f"\n✅ Batch job created!")
        print(f"📋 Job name: {batch_job.name}")
        print(f"📊 Status: {batch_job.state.name}")
        print(f"\n💡 To check status later, run:")
        print(f"   python batch_image_gen.py --mode status --job-name \"{batch_job.name}\"")
        
        # Clean up local JSONL file
        jsonl_file.unlink()
        
        return batch_job.name
        
    except Exception as e:
        print(f"❌ Error creating batch job: {e}")
        # Clean up on error
        if jsonl_file.exists():
            jsonl_file.unlink()
        return None


def check_job_status(client, job_name: str, wait: bool = False, save_results: bool = True):
    """
    Check the status of a batch job.
    Optionally wait for completion and save results.
    """
    print(f"\n🔍 Checking status for job: {job_name}")
    
    completed_states = {
        'JOB_STATE_SUCCEEDED',
        'JOB_STATE_FAILED',
        'JOB_STATE_CANCELLED',
        'JOB_STATE_EXPIRED',
    }
    
    try:
        batch_job = client.batches.get(name=job_name)
        print(f"📊 Current state: {batch_job.state.name}")
        
        if wait and batch_job.state.name not in completed_states:
            print("\n⏳ Waiting for job completion (polling every 30 seconds)...")
            print("   Press Ctrl+C to stop waiting (job will continue in background)")
            
            while batch_job.state.name not in completed_states:
                time.sleep(30)
                batch_job = client.batches.get(name=job_name)
                print(f"   📊 Status: {batch_job.state.name}")
        
        # Process results if succeeded
        if batch_job.state.name == 'JOB_STATE_SUCCEEDED' and save_results:
            print("\n🎉 Job completed successfully!")
            _save_batch_results(client, batch_job)
        elif batch_job.state.name == 'JOB_STATE_FAILED':
            print(f"\n❌ Job failed: {batch_job.error}")
        elif batch_job.state.name not in completed_states:
            print(f"\n⏳ Job still in progress: {batch_job.state.name}")
            print("   Run with --wait to wait for completion")
        
        return batch_job.state.name
        
    except Exception as e:
        print(f"❌ Error checking job status: {e}")
        return None


def _save_batch_results(client, batch_job):
    """Save results from a completed batch job."""
    # Use job ID (last part of name) for folder name
    job_id = batch_job.name.split("/")[-1]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create specific directory for this batch
    base_dir = ensure_output_dir()
    output_dir = base_dir / f"batch_{timestamp}_{job_id}"
    output_dir.mkdir(exist_ok=True)
    print(f"📂 Created output directory: {output_dir.name}")
    
    # Check for file-based results
    if batch_job.dest and batch_job.dest.file_name:
        result_file_name = batch_job.dest.file_name
        print(f"📁 Downloading results from: {result_file_name}")
        
        file_content_bytes = client.files.download(file=result_file_name)
        file_content = file_content_bytes.decode('utf-8')
        
        for line_num, line in enumerate(file_content.splitlines()):
            if line:
                _process_response_line(line, output_dir, timestamp, line_num)
    
    # Check for inline results
    elif batch_job.dest and batch_job.dest.inlined_responses:
        print("📦 Processing inline results...")
        
        for i, inline_response in enumerate(batch_job.dest.inlined_responses):
            if inline_response.response:
                _process_inline_response(inline_response.response, output_dir, timestamp, i)
            elif inline_response.error:
                print(f"  ❌ Response {i+1} error: {inline_response.error}")
    else:
        print("⚠️ No results found in job response.")


def _process_response_line(line: str, output_dir: Path, timestamp: str, index: int):
    """Process a single line from the JSONL results file."""
    parsed_response = json.loads(line)
    
    if 'response' in parsed_response and parsed_response['response']:
        response = parsed_response['response']
        if 'candidates' in response and response['candidates']:
            parts = response['candidates'][0]['content']['parts']
            _save_parts(parts, output_dir, timestamp, index)
    elif 'error' in parsed_response:
        print(f"  ❌ Response {index+1} error: {parsed_response['error']}")


def _process_inline_response(response, output_dir: Path, timestamp: str, index: int):
    """Process an inline response object."""
    try:
        for part in response.parts:
            if part.text:
                print(f"  📄 Response {index+1} text: {part.text}")
            elif part.inline_data:
                filename = f"result_{index+1}.png"
                filepath = output_dir / filename
                
                if Image:
                    image = part.as_image()
                    image.save(filepath)
                else:
                    with open(filepath, "wb") as f:
                        f.write(base64.b64decode(part.inline_data.data))
                
                print(f"  ✅ Saved: {filepath}")
    except Exception as e:
        print(f"  ⚠️ Error processing response {index+1}: {e}")


def _save_parts(parts: list, output_dir: Path, timestamp: str, index: int):
    """Save parts from a response."""
    for part_num, part in enumerate(parts):
        if part.get('text'):
            print(f"  📄 Response {index+1} text: {part['text']}")
        elif part.get('inlineData'):
            filename = f"result_{index+1}_{part_num}.png"
            filepath = output_dir / filename
            
            data = base64.b64decode(part['inlineData']['data'])
            with open(filepath, "wb") as f:
                f.write(data)
            
            print(f"  ✅ Saved: {filepath}")


def list_jobs(client, limit: int = 10):
    """List recent batch jobs."""
    print(f"\n📋 Listing recent batch jobs (limit: {limit})...")
    
    try:
        jobs = client.batches.list()
        count = 0
        for job in jobs:
            if count >= limit:
                break
            print(f"\n  📦 {job.name}")
            print(f"     Display name: {job.display_name if hasattr(job, 'display_name') else 'N/A'}")
            print(f"     State: {job.state.name}")
            count += 1
        
        if count == 0:
            print("  No batch jobs found.")
            
    except Exception as e:
        print(f"❌ Error listing jobs: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Batch Image Generation with Gemini API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate 4 images in batch mode using default prompts
  python batch_image_gen.py --mode batch

  # Generate 4 images and wait for results
  python batch_image_gen.py --mode batch --wait

  # Generate a single image
  python batch_image_gen.py --mode single --prompt "A futuristic dashboard UI"

  # Check status of an existing job
  python batch_image_gen.py --mode status --job-name "batches/123456"

  # List recent batch jobs
  python batch_image_gen.py --mode list
        """
    )
    
    parser.add_argument(
        "--mode",
        choices=["batch", "single", "status", "list"],
        default="batch",
        help="Operation mode: batch (4 images), single (1 image), status (check job), list (show jobs)"
    )
    
    parser.add_argument(
        "--prompt",
        type=str,
        help="Prompt for single image generation (required for --mode single)"
    )
    
    parser.add_argument(
        "--prompts-file",
        type=str,
        help="Path to a text file with prompts (one per line) for batch mode"
    )
    
    parser.add_argument(
        "--job-name",
        type=str,
        help="Job name for status checking (required for --mode status)"
    )
    
    parser.add_argument(
        "--wait",
        action="store_true",
        help="Wait for batch job completion (polls every 30 seconds)"
    )
    
    parser.add_argument(
        "--output-name",
        type=str,
        help="Custom name prefix for output files"
    )
    
    parser.add_argument(
        "--aspect-ratio",
        type=str,
        choices=ASPECT_RATIOS,
        default=DEFAULT_ASPECT_RATIO,
        help=f"Aspect ratio for generated images. Choices: {', '.join(ASPECT_RATIOS)}. Default: {DEFAULT_ASPECT_RATIO}"
    )
    
    parser.add_argument(
        "--model",
        type=str,
        choices=list(MODELS.keys()),
        default=DEFAULT_MODEL,
        help=f"Model to use. 'flash' = gemini-2.5-flash-image (faster), 'pro' = gemini-3-pro-image-preview (higher quality). Default: {DEFAULT_MODEL}"
    )
    
    parser.add_argument(
        "--resolution",
        type=str,
        choices=RESOLUTIONS,
        default=DEFAULT_RESOLUTION,
        help=f"Image resolution (only for 'pro' model). Choices: {', '.join(RESOLUTIONS)}. Default: {DEFAULT_RESOLUTION}"
    )
    
    parser.add_argument(
        "--reference-images",
        type=str,
        nargs='*',
        default=[],
        help="Path(s) to reference image(s) for image editing/generation (up to 5). Can specify multiple paths."
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.mode == "single" and not args.prompt:
        parser.error("--prompt is required for --mode single")
    
    if args.mode == "status" and not args.job_name:
        parser.error("--job-name is required for --mode status")
    
    # Initialize client
    client = get_client()
    print("✅ Gemini client initialized")
    
    # Execute based on mode
    if args.mode == "single":
        generate_single_image(client, args.prompt, args.output_name, args.aspect_ratio, args.model, args.resolution, args.reference_images)
    
    elif args.mode == "batch":
        # Load prompts
        if args.prompts_file:
            with open(args.prompts_file, "r") as f:
                prompts = [line.strip() for line in f if line.strip()]
        else:
            prompts = DEFAULT_BATCH_PROMPTS
        
        # Create batch job
        job_name = create_batch_job(client, prompts, aspect_ratio=args.aspect_ratio, model=args.model, resolution=args.resolution, reference_images=args.reference_images)
        
        if job_name and args.wait:
            check_job_status(client, job_name, wait=True)
    
    elif args.mode == "status":
        check_job_status(client, args.job_name, wait=args.wait)
    
    elif args.mode == "list":
        list_jobs(client)


if __name__ == "__main__":
    main()
