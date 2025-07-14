from flask import Flask, request, jsonify
import os
import tempfile
import base64
from io import BytesIO
from pypdf import PdfReader, PdfWriter
from flask_cors import CORS # Import CORS
from pdf2image import convert_from_path
from PIL import Image
from openai import OpenAI
from dotenv import load_dotenv

# Try to import heavy dependencies, fallback if not available
try:
    from docling.document_converter import DocumentConverter
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    DOCLING_AVAILABLE = True
except ImportError:
    DOCLING_AVAILABLE = False
    print("Warning: Docling not available. Some features may be limited.")

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    print("Warning: EasyOCR not available. OCR features may be limited.")

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Configure CORS
CORS(app, origins=["http://localhost:3000", "https://*.railway.app"])

# Configure OpenAI
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

@app.route('/')
def home():
    """Home route with service information."""
    features = []
    if DOCLING_AVAILABLE:
        features.append("Advanced PDF Processing (Docling)")
    if EASYOCR_AVAILABLE:
        features.append("OCR Processing (EasyOCR)")
    
    features.extend([
        "Basic PDF Processing (PyPDF2)",
        "PDF to Image Conversion",
        "OpenAI Integration",
        "Document Processing"
    ])
    
    return jsonify({
        "service": "ExamTopics PDF Conversion API",
        "version": "1.0.0", 
        "status": "running",
        "python_version": os.sys.version,
        "features": features,
        "endpoints": {
            "health": "/health",
            "convert_pdf": "/convert-pdf (POST)",
            "process_image": "/process-image (POST)"
        }
    })

@app.route('/health')
def health():
    """Health check endpoint for Railway."""
    return jsonify({
        "status": "healthy",
        "service": "pdf-conversion-api",
        "features": {
            "docling": DOCLING_AVAILABLE,
            "easyocr": EASYOCR_AVAILABLE,
            "openai": bool(os.getenv('OPENAI_API_KEY'))
        }
    }), 200

@app.route('/api/health')
def api_health():
    """Alternative health check endpoint for Railway (some configs expect /api/health)."""
    return health()

@app.route('/convert-pdf', methods=['POST'])
def convert_pdf():
    """Convert PDF to markdown using available processing methods."""
    try:
        # Check if file is provided
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'File must be a PDF'}), 400

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name

        try:
            # Try Docling first if available
            if DOCLING_AVAILABLE:
                result = process_with_docling(temp_path)
                if result:
                    return jsonify({
                        'markdown': result,
                        'method': 'docling',
                        'status': 'success'
                    })
            
            # Fallback to basic PDF processing
            result = process_with_pypdf(temp_path)
            return jsonify({
                'markdown': result,
                'method': 'pypdf',
                'status': 'success'
            })
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def process_with_docling(pdf_path):
    """Process PDF using Docling if available."""
    if not DOCLING_AVAILABLE:
        return None
    
    try:
        # Configure pipeline options for better performance
        pipeline_options = PdfPipelineOptions(
            do_ocr=False,  # Disable OCR for faster processing
            do_table_structure=True,
            table_structure_options={
                "do_cell_matching": True,
            }
        )
        
        # Initialize converter
        converter = DocumentConverter()
        
        # Convert document
        result = converter.convert(pdf_path, pipeline_options=pipeline_options)
        
        # Extract markdown
        markdown = result.document.export_to_markdown()
        return markdown
        
    except Exception as e:
        print(f"Docling processing failed: {e}")
        return None

def process_with_pypdf(pdf_path):
    """Fallback PDF processing using PyPDF2."""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PdfReader(file)
            text_content = []
            
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                if text.strip():
                    text_content.append(f"## Page {page_num + 1}\n\n{text}\n")
            
            if not text_content:
                return "No text content found in the PDF."
            
            return "\n".join(text_content)
            
    except Exception as e:
        return f"Error processing PDF: {str(e)}"

@app.route('/process-image', methods=['POST'])
def process_image():
    """Process image using available OCR methods."""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No image selected'}), 400

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name

        try:
            # Try EasyOCR if available
            if EASYOCR_AVAILABLE:
                result = process_with_easyocr(temp_path)
                if result:
                    return jsonify({
                        'text': result,
                        'method': 'easyocr',
                        'status': 'success'
                    })
            
            # Fallback message
            return jsonify({
                'text': 'OCR processing not available. Please ensure EasyOCR is installed.',
                'method': 'none',
                'status': 'limited'
            })
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def process_with_easyocr(image_path):
    """Process image using EasyOCR if available."""
    if not EASYOCR_AVAILABLE:
        return None
    
    try:
        reader = easyocr.Reader(['en'])
        results = reader.readtext(image_path)
        
        # Extract text from results
        text_content = []
        for (bbox, text, confidence) in results:
            if confidence > 0.5:  # Only include high-confidence text
                text_content.append(text)
        
        return " ".join(text_content)
        
    except Exception as e:
        print(f"EasyOCR processing failed: {e}")
        return None

# Production WSGI server detection
def is_railway():
    """Detect if running on Railway."""
    return os.getenv('RAILWAY_ENVIRONMENT') is not None

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    
    if is_railway():
        # Use Waitress for production on Railway
        from waitress import serve
        print(f"Starting production server on port {port}")
        serve(app, host='0.0.0.0', port=port)
    else:
        # Use Flask dev server for local development
        print(f"Starting development server on port {port}")
        app.run(host='0.0.0.0', port=port, debug=True)
