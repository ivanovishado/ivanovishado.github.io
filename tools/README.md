# UI Mock Generation Tools

Scripts for generating mock UI images using the Gemini API.

## Setup

1. **Create and activate virtual environment:**

   **Windows (PowerShell):**
   ```powershell
   # Create venv (already created if you cloned this)
   python -m venv venv
   
   # Activate venv
   .\venv\Scripts\Activate.ps1
   ```

   **Windows (Command Prompt):**
   ```cmd
   # Create venv
   python -m venv venv
   
   # Activate venv
   .\venv\Scripts\activate.bat
   ```

   **macOS/Linux:**
   ```bash
   # Create venv
   python -m venv venv
   
   # Activate venv
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up your API key:**
   ```bash
   # Option 1: Environment variable
   export GEMINI_API_KEY=your_api_key_here   # macOS/Linux
   $env:GEMINI_API_KEY="your_api_key_here"   # Windows PowerShell

   # Option 2: Create .env file
   cp .env.example .env
   # Then edit .env with your actual API key
   ```

   Get your API key from: https://aistudio.google.com/apikey

## Usage

### Batch Mode (multiple images at once)

Generate images using the default prompts (edit them in the script):

```bash
python batch_image_gen.py --mode batch
```

Generate and wait for results:
```bash
python batch_image_gen.py --mode batch --wait
```

Use custom prompts from a file (one prompt per line):
```bash
python batch_image_gen.py --mode batch --prompts-file prompts/my_prompts.txt --wait
```

### Single Mode (quick iteration)

Generate a single image immediately (uses standard API, faster turnaround):
```bash
python batch_image_gen.py --mode single --prompt "A futuristic dashboard UI with dark theme"
```

### Job Management

Check status of a batch job:
```bash
python batch_image_gen.py --mode status --job-name "batches/123456"
```

List recent batch jobs:
```bash
python batch_image_gen.py --mode list
```

## Output

Generated images are saved to `./generated_images/` with timestamps.

## Technical Notes

### Batch API Implementation

The script uses the **JSONL file upload method** for batch image generation. This is required because:

- The Batch API's inline request format doesn't support `generation_config` with `responseModalities`
- Image generation requires `responseModalities: ["TEXT", "IMAGE"]` in the config
- The JSONL file format properly supports all generation config options

The script automatically:
1. Creates a temporary JSONL file with your prompts
2. Uploads it to Gemini's file storage
3. Creates the batch job
4. Cleans up the local temp file

### Batch vs Single Mode

| Feature | Batch Mode | Single Mode |
|---------|------------|-------------|
| API Used | Batch API (file upload) | Standard generateContent |
| Cost | 50% of standard | Standard pricing |
| Turnaround | Up to 24 hours (usually faster) | Immediate |
| Rate Limits | Higher limits | Standard limits |
| Best For | Multiple images, iteration | Quick single tests |

## Prompts Tips

For UI mockups, be descriptive about:
- **Theme**: Dark/light, color palette (e.g., "neon indigo and cyan")
- **Style**: Glassmorphism, neumorphism, material design
- **Elements**: Cards, navigation, hero sections, data visualizations
- **Typography**: Modern, monospace, sci-fi themed
- **Effects**: Gradients, glow effects, animations (described visually)
- **Resolution**: Mention "4K", "high resolution", "highly detailed"

Example prompt:
```
A futuristic portfolio website hero section. Dark theme with neon
indigo and cyan accents. Shows floating 3D elements with holographic
UI. Glassmorphism cards with subtle gradients. Modern tech typography.
4K resolution, highly detailed, premium web design aesthetic.
```

## Troubleshooting

### "validation errors for BatchJobSource"
This error occurs if using inline requests with `generation_config`. The script now uses JSONL file upload which avoids this issue.

### "GEMINI_API_KEY not set"
Make sure you've either:
- Set the environment variable: `$env:GEMINI_API_KEY="your_key"`
- Created a `.env` file with `GEMINI_API_KEY=your_key`

### Job stuck in PENDING
Batch jobs can take up to 24 hours, but usually complete within minutes. Use `--mode status` to check progress.
