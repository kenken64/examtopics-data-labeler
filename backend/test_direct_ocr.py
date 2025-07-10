#!/usr/bin/env python3
"""
Direct test of OCR functionality to see OpenAI response
"""
import os
import tempfile
import base64
from io import BytesIO
from pypdf import PdfReader, PdfWriter
from pdf2image import convert_from_path
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_ocr_direct():
    """Test OCR functionality directly without Flask server"""
    
    print("🧪 Direct OCR Test")
    print("=" * 40)
    
    # Check API key
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("❌ No OpenAI API key found")
        return
    
    print(f"🔑 API Key: {api_key[:10]}...{api_key[-4:]}")
    
    pdf_path = "data/AIF-C01-Q1-50-no-answers.pdf"
    page_number = 1
    
    if not os.path.exists(pdf_path):
        print(f"❌ PDF not found: {pdf_path}")
        return
    
    print(f"📄 Processing: {pdf_path} (page {page_number})")
    
    try:
        # Extract specific page
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_pdf:
            reader = PdfReader(pdf_path)
            writer = PdfWriter()
            writer.add_page(reader.pages[page_number - 1])
            writer.write(temp_pdf)
            temp_pdf_path = temp_pdf.name
        
        print(f"📃 Extracted page to: {temp_pdf_path}")
        
        # Convert to image
        print("🖼️  Converting PDF to image...")
        images = convert_from_path(temp_pdf_path, dpi=300)
        print(f"✅ Generated {len(images)} image(s)")
        
        if not images:
            print("❌ No images generated")
            return
        
        # Process with OpenAI
        client = OpenAI(api_key=api_key)
        image = images[0]
        
        print("📤 Sending to OpenAI...")
        
        # Convert to base64
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        print(f"📊 Image size: {len(img_base64)} characters (base64)")
        
        # Make OpenAI request
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Convert this image to clean markdown text. Extract all text content while preserving structure, formatting, and hierarchy. Use proper markdown syntax for headers, lists, code blocks, and emphasis. If this appears to be an exam question, preserve the question structure and answer choices clearly."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{img_base64}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=4000,
            temperature=0.1
        )
        
        # Print detailed response
        print("\n" + "="*50)
        print("🤖 OPENAI RESPONSE DETAILS")
        print("="*50)
        print(f"Model: {response.model}")
        print(f"Usage: {response.usage}")
        print(f"Finish reason: {response.choices[0].finish_reason}")
        print(f"Response ID: {response.id}")
        print(f"Created: {response.created}")
        
        content = response.choices[0].message.content
        if content:
            print(f"\nContent length: {len(content)} characters")
            print("\n" + "-"*50)
            print("📄 EXTRACTED CONTENT:")
            print("-"*50)
            print(content)
            print("-"*50)
        else:
            print("❌ No content in response")
        
        # Cleanup
        os.unlink(temp_pdf_path)
        print(f"\n🧹 Cleaned up: {temp_pdf_path}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ocr_direct()
