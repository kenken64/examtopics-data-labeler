from flask import Flask, request, jsonify
import os
import tempfile
from docling.document_converter import DocumentConverter
from pypdf import PdfReader, PdfWriter
from flask_cors import CORS # Import CORS

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
