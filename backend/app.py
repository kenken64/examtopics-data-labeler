from flask import Flask, request, jsonify
import os
import tempfile
import base64
from io import BytesIO
from docling.document_converter import DocumentConverter
from pypdf import PdfReader, PdfWriter
from flask_cors import CORS # Import CORS
from pdf2image import convert_from_path
from PIL import Image
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.debug = True # Enable debug mode
CORS(app) # Enable CORS for all routes

@app.route('/convert-pdf', methods=['POST'])
def convert_pdf():
    print("Received request to /convert-pdf")
    if 'pdfFile' not in request.files:
        print("Error: No pdfFile part in the request")
        return jsonify({'error': 'No pdfFile part in the request'}), 400

    pdf_file = request.files['pdfFile']
    if pdf_file.filename == '':
        print("Error: No selected file")
        return jsonify({'error': 'No selected file'}), 400

    page_number_str = request.form.get('pageNumber')
    page_number = None
    if page_number_str:
        try:
            page_number = int(page_number_str)
            print(f"Page number requested: {page_number}")
        except ValueError:
            print(f"Error: Invalid pageNumber provided: {page_number_str}")
            return jsonify({'error': 'Invalid pageNumber provided.'}), 400

    if pdf_file:
        original_pdf_path = None
        single_page_pdf_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_pdf:
                pdf_file.save(temp_pdf.name)
                original_pdf_path = temp_pdf.name
            print(f"Original PDF saved to: {original_pdf_path}")

            pdf_to_convert_path = original_pdf_path

            if page_number is not None:
                reader = PdfReader(original_pdf_path)
                if not (0 <= page_number - 1 < len(reader.pages)):
                    print(f"Error: Page number {page_number} is out of bounds. Total pages: {len(reader.pages)}")
                    return jsonify({'error': f'Page number {page_number} is out of bounds.'}), 400

                writer = PdfWriter()
                writer.add_page(reader.pages[page_number - 1])
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as single_page_pdf:
                    writer.write(single_page_pdf)
                    single_page_pdf_path = single_page_pdf.name
                    pdf_to_convert_path = single_page_pdf_path
                print(f"Single page PDF saved to: {single_page_pdf_path}")

            print(f"Converting PDF from path: {pdf_to_convert_path}")
            converter = DocumentConverter()
            result = converter.convert(pdf_to_convert_path)
            markdown_content = result.document.export_to_markdown()
            print("PDF conversion successful.")

            if markdown_content:
                print(f"Markdown content generated (first 200 chars):\n{markdown_content[:200]}")
                return jsonify({'markdown': markdown_content}), 200
            else:
                print("No markdown content found after conversion.")
                return jsonify({'error': 'No markdown content found.'}), 500
        except Exception as e:
            print(f"Error during PDF conversion: {e}")
            import traceback
            traceback.print_exc() # Print full traceback to console
            return jsonify({'error': f'Error during PDF conversion: {e}'}), 500
        finally:
            if original_pdf_path and os.path.exists(original_pdf_path):
                os.remove(original_pdf_path)
                print(f"Cleaned up original PDF: {original_pdf_path}")
            if single_page_pdf_path and os.path.exists(single_page_pdf_path):
                os.remove(single_page_pdf_path)
                print(f"Cleaned up single page PDF: {single_page_pdf_path}")

@app.route('/convert-pdf-ocr', methods=['POST'])
def convert_pdf_ocr():
    print("Received request to /convert-pdf-ocr")
    if 'pdfFile' not in request.files:
        print("Error: No pdfFile part in the request")
        return jsonify({'error': 'No pdfFile part in the request'}), 400

    pdf_file = request.files['pdfFile']
    if pdf_file.filename == '':
        print("Error: No selected file")
        return jsonify({'error': 'No selected file'}), 400

    page_number_str = request.form.get('pageNumber')
    page_number = None
    if page_number_str:
        try:
            page_number = int(page_number_str)
            print(f"Page number requested: {page_number}")
        except ValueError:
            print(f"Error: Invalid pageNumber provided: {page_number_str}")
            return jsonify({'error': 'Invalid pageNumber provided.'}), 400

    # Get OpenAI API key from environment
    openai_api_key = os.environ.get('OPENAI_API_KEY')
    if not openai_api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        return jsonify({'error': 'OpenAI API key not configured'}), 500

    if pdf_file:
        original_pdf_path = None
        single_page_pdf_path = None
        try:
            # Save uploaded PDF to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_pdf:
                pdf_file.save(temp_pdf.name)
                original_pdf_path = temp_pdf.name
            print(f"Original PDF saved to: {original_pdf_path}")

            pdf_to_convert_path = original_pdf_path

            # Extract specific page if requested
            if page_number is not None:
                reader = PdfReader(original_pdf_path)
                if not (0 <= page_number - 1 < len(reader.pages)):
                    print(f"Error: Page number {page_number} is out of bounds. Total pages: {len(reader.pages)}")
                    return jsonify({'error': f'Page number {page_number} is out of bounds.'}), 400

                writer = PdfWriter()
                writer.add_page(reader.pages[page_number - 1])
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as single_page_pdf:
                    writer.write(single_page_pdf)
                    single_page_pdf_path = single_page_pdf.name
                    pdf_to_convert_path = single_page_pdf_path
                print(f"Single page PDF saved to: {single_page_pdf_path}")

            print(f"Converting PDF to images from path: {pdf_to_convert_path}")
            
            # Convert PDF to images using pdf2image
            images = convert_from_path(pdf_to_convert_path, dpi=300)
            print(f"Converted PDF to {len(images)} image(s)")

            if not images:
                print("No images generated from PDF")
                return jsonify({'error': 'Failed to convert PDF to images'}), 500

            # Process each image with OpenAI OCR
            client = OpenAI(api_key=openai_api_key)
            all_markdown_content = []

            for i, image in enumerate(images):
                print(f"Processing image {i+1} of {len(images)}")
                
                # Convert PIL image to base64 for OpenAI API
                buffered = BytesIO()
                image.save(buffered, format="PNG")
                img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                
                try:
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
                    
                    # Print OpenAI response details
                    print(f"OpenAI Response for image {i+1}:")
                    print(f"  Model: {response.model}")
                    print(f"  Usage: {response.usage}")
                    print(f"  Finish reason: {response.choices[0].finish_reason}")
                    
                    page_markdown = response.choices[0].message.content
                    if page_markdown:
                        print(f"  Content length: {len(page_markdown)} characters")
                        print(f"  Content preview (first 200 chars): {page_markdown[:200]}...")
                        print(f"  Full content:\n{'-' * 50}")
                        print(page_markdown)
                        print(f"{'-' * 50}")
                        all_markdown_content.append(page_markdown)
                        print(f"Successfully extracted markdown from image {i+1}")
                    else:
                        print(f"No content extracted from image {i+1}")
                        
                except Exception as e:
                    print(f"Error processing image {i+1} with OpenAI: {e}")
                    # Continue processing other images even if one fails
                    continue

            if not all_markdown_content:
                print("No markdown content extracted from any images")
                return jsonify({'error': 'Failed to extract text from images'}), 500

            # Combine all markdown content
            final_markdown = '\n\n---\n\n'.join(all_markdown_content)
            print(f"Successfully generated markdown content ({len(final_markdown)} characters)")
            
            return jsonify({'markdown': final_markdown}), 200

        except Exception as e:
            print(f"Error during PDF-to-OCR conversion: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Error during PDF-to-OCR conversion: {e}'}), 500
        finally:
            # Clean up temporary files
            if original_pdf_path and os.path.exists(original_pdf_path):
                os.remove(original_pdf_path)
                print(f"Cleaned up original PDF: {original_pdf_path}")
            if single_page_pdf_path and os.path.exists(single_page_pdf_path):
                os.remove(single_page_pdf_path)
                print(f"Cleaned up single page PDF: {single_page_pdf_path}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
