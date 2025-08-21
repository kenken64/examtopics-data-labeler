"""
Pytest configuration and fixtures for backend tests
"""
import pytest
import tempfile
import os
from unittest.mock import Mock, patch
from io import BytesIO
from PIL import Image
import base64

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app


@pytest.fixture
def client():
    """Flask test client fixture"""
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    with app.test_client() as client:
        with app.app_context():
            yield client


@pytest.fixture
def mock_openai():
    """Mock OpenAI client"""
    with patch('app.OpenAI') as mock_client:
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "# Test Markdown Content\n\nThis is a test conversion."
        mock_response.choices[0].finish_reason = "stop"
        mock_response.model = "gpt-4o"
        mock_response.usage = Mock()
        mock_response.usage.prompt_tokens = 100
        mock_response.usage.completion_tokens = 50
        mock_response.usage.total_tokens = 150
        
        mock_client.return_value.chat.completions.create.return_value = mock_response
        yield mock_client


@pytest.fixture
def sample_pdf_file():
    """Create a sample PDF file for testing"""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    p.drawString(100, 750, "Sample PDF Content")
    p.drawString(100, 700, "Question 1: What is AWS?")
    p.drawString(100, 650, "A) Amazon Web Services")
    p.drawString(100, 600, "B) Advanced Web System")
    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer


@pytest.fixture
def sample_image():
    """Create a sample image for testing"""
    img = Image.new('RGB', (800, 600), color='white')
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


@pytest.fixture
def sample_image_b64():
    """Base64 encoded sample image"""
    img = Image.new('RGB', (100, 100), color='red')
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


@pytest.fixture
def mock_docling_converter():
    """Mock docling DocumentConverter"""
    with patch('app.DocumentConverter') as mock_converter:
        mock_result = Mock()
        mock_result.document.export_to_markdown.return_value = "# Sample Document\n\nTest content from docling."
        mock_result.document.pages = [Mock()]
        mock_result.document.body.children = [Mock(), Mock()]
        
        mock_converter.return_value.convert.return_value = mock_result
        yield mock_converter


@pytest.fixture
def mock_pdf2image():
    """Mock pdf2image convert_from_path"""
    with patch('app.convert_from_path') as mock_convert:
        # Create sample PIL images
        images = [
            Image.new('RGB', (800, 600), color='white'),
            Image.new('RGB', (800, 600), color='lightgray')
        ]
        mock_convert.return_value = images
        yield mock_convert


@pytest.fixture
def temp_pdf_path():
    """Create temporary PDF file path"""
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        yield tmp.name
    if os.path.exists(tmp.name):
        os.unlink(tmp.name)


@pytest.fixture
def mock_environment():
    """Mock environment variables"""
    with patch.dict(os.environ, {
        'OPENAI_API_KEY': 'test-api-key',
        'FLASK_ENV': 'testing',
        'FLASK_DEBUG': 'true'
    }):
        yield


@pytest.fixture
def mock_pypdf_reader():
    """Mock PyPDF reader"""
    with patch('app.PdfReader') as mock_reader:
        mock_page = Mock()
        mock_reader.return_value.pages = [mock_page, mock_page, mock_page]
        yield mock_reader


@pytest.fixture 
def mock_pypdf_writer():
    """Mock PyPDF writer"""
    with patch('app.PdfWriter') as mock_writer:
        mock_instance = Mock()
        mock_writer.return_value = mock_instance
        yield mock_writer