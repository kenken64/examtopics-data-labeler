"""
Additional test fixtures and factory functions
"""
import pytest
import tempfile
import os
from io import BytesIO
from PIL import Image, ImageDraw
import base64
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from unittest.mock import Mock


class PDFFactory:
    """Factory for creating test PDF files"""
    
    @staticmethod
    def create_simple_pdf():
        """Create a simple PDF with basic text"""
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.drawString(100, 750, "Simple Test Document")
        p.drawString(100, 700, "This is a test PDF file.")
        p.save()
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def create_exam_pdf():
        """Create a PDF that looks like an exam question"""
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        p.drawString(100, 750, "AWS Certified Solutions Architect")
        p.drawString(100, 720, "Practice Exam - Questions 1-5")
        p.drawString(100, 680, "Question 1: Which service provides object storage?")
        p.drawString(120, 650, "A) Amazon EC2")
        p.drawString(120, 620, "B) Amazon S3")
        p.drawString(120, 590, "C) Amazon RDS")
        p.drawString(120, 560, "D) Amazon VPC")
        p.drawString(100, 520, "Answer: B")
        p.drawString(100, 490, "Explanation: Amazon S3 provides object storage...")
        
        p.save()
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def create_multipage_pdf():
        """Create a multi-page PDF"""
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        
        # Page 1
        p.drawString(100, 750, "Page 1: Introduction")
        p.drawString(100, 700, "This is the first page of a multi-page document.")
        p.showPage()
        
        # Page 2
        p.drawString(100, 750, "Page 2: Content")
        p.drawString(100, 700, "This is the second page with different content.")
        p.showPage()
        
        # Page 3
        p.drawString(100, 750, "Page 3: Conclusion")
        p.drawString(100, 700, "This is the final page of the document.")
        
        p.save()
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def create_empty_pdf():
        """Create an empty PDF"""
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.save()
        buffer.seek(0)
        return buffer


class ImageFactory:
    """Factory for creating test images"""
    
    @staticmethod
    def create_text_image(text="Sample Text", size=(800, 600)):
        """Create an image with text"""
        img = Image.new('RGB', size, color='white')
        draw = ImageDraw.Draw(img)
        draw.text((10, 10), text, fill='black')
        return img
    
    @staticmethod
    def create_exam_question_image():
        """Create an image that looks like an exam question"""
        img = Image.new('RGB', (800, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        draw.text((50, 50), "Question 1: What is AWS Lambda?", fill='black')
        draw.text((70, 100), "A) A compute service", fill='black')
        draw.text((70, 130), "B) A storage service", fill='black')
        draw.text((70, 160), "C) A database service", fill='black')
        draw.text((70, 190), "D) A networking service", fill='black')
        
        return img
    
    @staticmethod
    def create_colored_image(color='red', size=(400, 300)):
        """Create a solid colored image"""
        return Image.new('RGB', size, color=color)
    
    @staticmethod
    def create_complex_image():
        """Create a more complex image with shapes"""
        img = Image.new('RGB', (800, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        # Draw some shapes
        draw.rectangle([100, 100, 200, 200], fill='blue', outline='black')
        draw.ellipse([300, 100, 400, 200], fill='red', outline='black')
        draw.text((100, 250), "Complex Image Content", fill='black')
        
        return img


class MockResponseFactory:
    """Factory for creating mock responses"""
    
    @staticmethod
    def create_openai_response(content="Mock response content", model="gpt-4o"):
        """Create a mock OpenAI response"""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = content
        mock_response.choices[0].finish_reason = "stop"
        mock_response.model = model
        mock_response.usage = Mock()
        mock_response.usage.prompt_tokens = 100
        mock_response.usage.completion_tokens = 50
        mock_response.usage.total_tokens = 150
        return mock_response
    
    @staticmethod
    def create_docling_response(markdown_content="# Mock Document\n\nTest content"):
        """Create a mock docling response"""
        mock_result = Mock()
        mock_result.document.export_to_markdown.return_value = markdown_content
        mock_result.document.pages = [Mock()]
        mock_result.document.body.children = [Mock(), Mock()]
        return mock_result
    
    @staticmethod
    def create_error_response(error_message="Mock error"):
        """Create a mock error response"""
        mock_response = Mock()
        mock_response.side_effect = Exception(error_message)
        return mock_response


@pytest.fixture
def pdf_factory():
    """Provide PDF factory"""
    return PDFFactory()


@pytest.fixture
def image_factory():
    """Provide image factory"""
    return ImageFactory()


@pytest.fixture
def mock_factory():
    """Provide mock response factory"""
    return MockResponseFactory()


@pytest.fixture
def sample_exam_pdf(pdf_factory):
    """Sample exam PDF fixture"""
    return pdf_factory.create_exam_pdf()


@pytest.fixture
def sample_multipage_pdf(pdf_factory):
    """Sample multi-page PDF fixture"""
    return pdf_factory.create_multipage_pdf()


@pytest.fixture
def sample_text_image(image_factory):
    """Sample text image fixture"""
    return image_factory.create_text_image("Test Image Content")


@pytest.fixture
def sample_exam_image(image_factory):
    """Sample exam question image fixture"""
    return image_factory.create_exam_question_image()


@pytest.fixture
def large_pdf_content():
    """Create large PDF content for testing"""
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Create multiple pages with lots of content
    for page_num in range(5):
        p.drawString(100, 750, f"Page {page_num + 1}")
        
        # Add lots of text lines
        y_position = 700
        for line_num in range(30):
            p.drawString(100, y_position, f"Line {line_num + 1} on page {page_num + 1} with some content")
            y_position -= 20
            if y_position < 100:
                break
        
        p.showPage()
    
    p.save()
    buffer.seek(0)
    return buffer


@pytest.fixture
def corrupted_pdf():
    """Create corrupted PDF data"""
    return BytesIO(b"This is not a valid PDF file content")


@pytest.fixture
def base64_image_data(image_factory):
    """Base64 encoded image data"""
    img = image_factory.create_text_image("Base64 Test")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


@pytest.fixture
def temp_directory():
    """Create temporary directory for tests"""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


@pytest.fixture
def mock_successful_conversion():
    """Mock successful PDF conversion"""
    return {
        'markdown': """# AWS Certification Practice

## Question 1: Core Services

What is Amazon S3 primarily used for?

A) Computing
B) Object Storage
C) Database
D) Networking

**Answer: B**

**Explanation:** Amazon S3 is Amazon's object storage service."""
    }


@pytest.fixture
def mock_failed_conversion():
    """Mock failed PDF conversion"""
    return {
        'error': 'Conversion failed due to unsupported format'
    }


@pytest.fixture
def sample_api_responses():
    """Sample API responses for various scenarios"""
    return {
        'health_success': {
            'status': 'healthy',
            'service': 'examtopics-backend',
            'version': '1.0.0',
            'environment': 'testing'
        },
        'conversion_success': {
            'markdown': '# Test Document\n\nSuccessfully converted content.'
        },
        'conversion_error': {
            'error': 'PDF conversion failed'
        },
        'ocr_success': {
            'markdown': '# OCR Result\n\nText extracted from image.'
        },
        'ocr_error': {
            'error': 'OCR processing failed'
        }
    }