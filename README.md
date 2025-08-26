# AI Image Editor

A React webapp that allows users to edit images using Hugging Face's Qwen-Image-Edit model via the Hugging Face Inference API.

## Features

- Upload images for editing
- Enter text prompts to describe desired edits
- Preview original images before processing
- Display edited results from AI model
- Clean, intuitive UI built with shadcn/ui

## Setup

1. Get a FAL AI Face API key 

2. Add your API key to `.env.local`:
   \`\`\`
   FAL_API_KEY=your_api_key_here
   \`\`\`

3. The app will automatically handle:
   - File uploads (multipart/form-data)
   - API calls 
   - Image preview and result display

## Usage

1. Upload an image using the file input
2. Enter a prompt describing how you want to edit the image
3. Click "Edit Image" to process
4. View the AI-edited result

## Technical Details

- Built with Next.js 14 App Router
- Uses Hugging Face Inference API
- Handles image uploads and processing
- Responsive design with shadcn/ui components
- Server-side API route for secure API key handling
