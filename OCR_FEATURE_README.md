# PDF-to-Markdown OCR Conversion Feature

## Overview

The AWS Cert Web application now includes an advanced PDF-to-Markdown conversion feature using OpenAI's OCR capabilities. This provides an alternative to the standard document parsing method for better handling of scanned documents and complex layouts.

## Features

### Two Conversion Methods

1. **Standard Conversion** (`/convert-pdf`)
   - Fast document parsing using docling library
   - Best for text-based PDFs with selectable text
   - No external API dependencies
   - Maintains existing functionality

2. **AI OCR Conversion** (`/convert-pdf-ocr`) ⭐ NEW
   - Advanced image recognition using OpenAI's GPT-4o with vision
   - Converts PDF pages to high-resolution images (300 DPI)
   - Uses AI to extract and structure text with proper markdown formatting
   - Ideal for scanned documents, handwritten content, or complex layouts
   - Preserves question structure and formatting for exam materials

## Setup Requirements

### Backend Dependencies

```bash
# Install required packages (already in requirements.txt)
pip install pdf2image openai Pillow

# Install system dependencies (required for pdf2image)
sudo apt-get install poppler-utils  # Ubuntu/Debian
# or
brew install poppler  # macOS
```

### Environment Configuration

Set your OpenAI API key using a `.env` file in the backend directory:

```bash
# Option 1: Use the setup script (recommended)
./setup_openai_key.sh

# Option 2: Manual setup
cd backend
cp .env.example .env
# Edit .env file and replace 'your_openai_api_key_here' with your actual API key
```

The `.env` file should contain:
```env
OPENAI_API_KEY=sk-your_actual_openai_api_key_here
FLASK_DEBUG=True
FLASK_ENV=development
```

**Note**: The `.env` file is automatically loaded by the Flask application using python-dotenv.

## API Endpoints

### Standard Conversion
```http
POST /convert-pdf
Content-Type: multipart/form-data

Form Data:
- pdfFile: PDF file
- pageNumber: Page number to convert (optional)
```

### OCR Conversion
```http
POST /convert-pdf-ocr
Content-Type: multipart/form-data

Form Data:
- pdfFile: PDF file  
- pageNumber: Page number to convert (optional)

Headers:
- Requires OPENAI_API_KEY environment variable
```

## Frontend Integration

The home page now includes two conversion buttons:

- **Standard Conversion**: Fast processing for text-based PDFs
- **AI OCR Conversion**: Advanced processing for scanned/complex documents

Both methods integrate seamlessly with the existing highlighting system and maintain all current functionality.

## Usage Recommendations

### Use Standard Conversion When:
- PDF contains selectable text
- Fast processing is needed
- Working with simple document layouts
- No external API dependencies desired

### Use OCR Conversion When:
- PDF is a scanned image
- Document has complex layouts or formatting
- Text extraction quality is poor with standard method
- Working with handwritten or low-quality documents
- Need AI-enhanced text structure recognition

## Error Handling

The OCR endpoint includes robust error handling:
- Missing API key detection
- Image processing failures
- OpenAI API rate limiting
- Timeout handling for large documents
- Graceful fallback messaging

## Testing

Use the provided test script to verify functionality:

```bash
cd backend
python test_ocr_endpoint.py
```

## Performance Notes

- OCR conversion takes longer than standard conversion (typically 10-30 seconds per page)
- Uses OpenAI API credits (approximately 0.01-0.05 USD per page depending on complexity)
- Processes images at 300 DPI for optimal text recognition
- Multiple pages are processed sequentially and combined with separators

## Integration with Highlighting System

Both conversion methods work seamlessly with the enhanced highlighting system:
- Maintains cumulative content across pages
- Preserves highlight data when switching between conversion methods
- Compatible with all existing features (question labeling, answer formatting, etc.)
