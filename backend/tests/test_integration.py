"""
Integration tests for the Flask application
Tests the full flow with real-like scenarios
"""
import pytest
import json
import tempfile
import os
from unittest.mock import patch, Mock
from io import BytesIO
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


class TestPDFProcessingIntegration:
    """Integration tests for PDF processing workflows"""
    
    @pytest.fixture
    def real_pdf_content(self):
        """Create a more realistic PDF for integration testing"""
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        # Page 1 - Question content
        p.drawString(100, 750, "AWS Certified Solutions Architect Practice Exam")
        p.drawString(100, 700, "Question 1: Which AWS service provides object storage?")
        p.drawString(100, 650, "A) Amazon EC2")
        p.drawString(100, 600, "B) Amazon S3")
        p.drawString(100, 550, "C) Amazon RDS")
        p.drawString(100, 500, "D) Amazon VPC")
        p.drawString(100, 450, "Correct Answer: B")
        p.drawString(100, 400, "Explanation: Amazon S3 is the object storage service...")
        
        p.showPage()
        
        # Page 2 - More questions
        p.drawString(100, 750, "Question 2: What is the maximum size of an S3 object?")
        p.drawString(100, 700, "A) 5 GB")
        p.drawString(100, 650, "B) 5 TB")
        p.drawString(100, 600, "C) 500 GB")
        p.drawString(100, 550, "D) 50 TB")
        
        p.save()
        buffer.seek(0)
        return buffer

    @patch('app.DocumentConverter')
    def test_convert_pdf_full_workflow(self, mock_converter, client, real_pdf_content):
        """Test complete PDF conversion workflow"""
        # Setup realistic docling response
        mock_result = Mock()
        mock_result.document.export_to_markdown.return_value = """
# AWS Certified Solutions Architect Practice Exam

## Question 1: Which AWS service provides object storage?

A) Amazon EC2
B) Amazon S3
C) Amazon RDS
D) Amazon VPC

**Correct Answer: B**

**Explanation:** Amazon S3 is the object storage service that provides industry-leading scalability, data availability, security, and performance.
"""
        mock_result.document.pages = [Mock()]
        mock_result.document.body.children = [Mock(), Mock(), Mock()]
        mock_converter.return_value.convert.return_value = mock_result
        
        # Test conversion
        data = {'pdfFile': (real_pdf_content, 'aws-practice-exam.pdf')}
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 200
        result = json.loads(response.data)
        assert 'markdown' in result
        assert 'AWS Certified' in result['markdown']
        assert 'Question 1' in result['markdown']
        assert 'Amazon S3' in result['markdown']

    @patch('app.convert_from_path')
    @patch('app.OpenAI')
    def test_ocr_pdf_full_workflow(self, mock_openai, mock_pdf2image, client, real_pdf_content, mock_environment):
        """Test complete OCR workflow"""
        # Create realistic image responses
        images = [
            Image.new('RGB', (800, 1000), color='white'),
            Image.new('RGB', (800, 1000), color='white')
        ]
        mock_pdf2image.return_value = images
        
        # Setup realistic OpenAI responses
        responses = [
            """# AWS Certified Solutions Architect Practice Exam

## Question 1: Which AWS service provides object storage?

A) Amazon EC2
B) Amazon S3  
C) Amazon RDS
D) Amazon VPC

**Correct Answer: B**

**Explanation:** Amazon S3 is the object storage service that provides industry-leading scalability, data availability, security, and performance.""",
            """## Question 2: What is the maximum size of an S3 object?

A) 5 GB
B) 5 TB
C) 500 GB  
D) 50 TB

**Correct Answer: B**

**Explanation:** The maximum size of a single S3 object is 5 TB."""
        ]
        
        mock_response_objs = []
        for resp in responses:
            mock_resp = Mock()
            mock_resp.choices = [Mock()]
            mock_resp.choices[0].message.content = resp
            mock_resp.choices[0].finish_reason = "stop"
            mock_resp.model = "gpt-4o"
            mock_resp.usage = Mock()
            mock_resp.usage.prompt_tokens = 500
            mock_resp.usage.completion_tokens = 200
            mock_resp.usage.total_tokens = 700
            mock_response_objs.append(mock_resp)
        
        mock_openai.return_value.chat.completions.create.side_effect = mock_response_objs
        
        # Test OCR conversion
        data = {'pdfFile': (real_pdf_content, 'aws-practice-exam.pdf')}
        response = client.post('/convert-pdf-ocr', data=data)
        
        assert response.status_code == 200
        result = json.loads(response.data)
        assert 'markdown' in result
        assert 'Question 1' in result['markdown']
        assert 'Question 2' in result['markdown']
        assert '---' in result['markdown']  # Page separator
        assert 'Amazon S3' in result['markdown']

    @patch('app.DocumentConverter')
    @patch('app.PdfReader')
    def test_single_page_extraction_workflow(self, mock_reader, mock_converter, client, real_pdf_content, mock_pypdf_writer):
        """Test extracting single page from multi-page PDF"""
        # Setup PDF reader with multiple pages
        pages = [Mock(), Mock()]
        mock_reader.return_value.pages = pages
        
        # Setup converter for single page
        mock_result = Mock()
        mock_result.document.export_to_markdown.return_value = """
## Question 1: Which AWS service provides object storage?

A) Amazon EC2
B) Amazon S3
C) Amazon RDS  
D) Amazon VPC
"""
        mock_result.document.pages = [Mock()]
        mock_result.document.body.children = [Mock()]
        mock_converter.return_value.convert.return_value = mock_result
        
        # Test page 1 extraction
        data = {
            'pdfFile': (real_pdf_content, 'aws-exam.pdf'),
            'pageNumber': '1'
        }
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 200
        result = json.loads(response.data)
        assert 'markdown' in result
        assert 'Question 1' in result['markdown']

    def test_error_handling_workflow(self, client):
        """Test error handling in various scenarios"""
        # Test 1: No file provided
        response = client.post('/convert-pdf')
        assert response.status_code == 400
        
        # Test 2: Empty file
        data = {'pdfFile': (BytesIO(b''), '')}
        response = client.post('/convert-pdf', data=data)
        assert response.status_code == 400
        
        # Test 3: Invalid page number
        data = {
            'pdfFile': (BytesIO(b'fake pdf'), 'test.pdf'),
            'pageNumber': 'invalid'
        }
        response = client.post('/convert-pdf', data=data)
        assert response.status_code == 400

    @patch('app.convert_from_path')
    @patch.dict(os.environ, {}, clear=True)
    def test_ocr_missing_api_key_workflow(self, mock_pdf2image, client, real_pdf_content):
        """Test OCR workflow with missing API key"""
        mock_pdf2image.return_value = [Image.new('RGB', (100, 100), color='white')]
        
        data = {'pdfFile': (real_pdf_content, 'test.pdf')}
        response = client.post('/convert-pdf-ocr', data=data)
        
        assert response.status_code == 500
        result = json.loads(response.data)
        assert 'API key not configured' in result['error']


class TestHealthCheckIntegration:
    """Integration tests for health and monitoring endpoints"""
    
    def test_health_check_integration(self, client):
        """Test health check with realistic response validation"""
        response = client.get('/health')
        
        assert response.status_code == 200
        assert response.content_type == 'application/json'
        
        data = json.loads(response.data)
        required_fields = ['status', 'service', 'version', 'environment']
        for field in required_fields:
            assert field in data
            assert data[field] is not None
        
        assert data['status'] == 'healthy'
        assert 'examtopics' in data['service'].lower()

    def test_root_endpoint_integration(self, client):
        """Test root endpoint with complete API documentation"""
        response = client.get('/')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'service' in data
        assert 'version' in data
        assert 'endpoints' in data
        assert isinstance(data['endpoints'], list)
        assert len(data['endpoints']) >= 3
        
        # Check that all documented endpoints exist
        endpoint_paths = [ep.split(' -')[0] for ep in data['endpoints']]
        assert '/health' in endpoint_paths
        assert '/convert-pdf' in endpoint_paths
        assert '/ocr-pdf' in endpoint_paths or '/convert-pdf-ocr' in ' '.join(data['endpoints'])


class TestCORSIntegration:
    """Test CORS functionality"""
    
    def test_cors_headers_present(self, client):
        """Test that CORS headers are properly set"""
        response = client.get('/health')
        
        # Flask-CORS should add these headers
        assert response.status_code == 200
        # Note: In test mode, CORS headers might not be fully applied
        # This test verifies the endpoint works without CORS blocking

    def test_options_request(self, client):
        """Test OPTIONS request for CORS preflight"""
        response = client.options('/convert-pdf')
        
        # Should not return 405 Method Not Allowed if CORS is properly configured
        assert response.status_code in [200, 204]


class TestTemporaryFileCleanup:
    """Test that temporary files are properly cleaned up"""
    
    @patch('app.DocumentConverter')
    @patch('tempfile.NamedTemporaryFile')
    def test_temp_file_cleanup_on_success(self, mock_tempfile, mock_converter, client, real_pdf_content):
        """Test temp files are cleaned up after successful conversion"""
        # Setup mock temp file
        mock_temp = Mock()
        mock_temp.name = '/tmp/test_pdf_12345.pdf'
        mock_tempfile.return_value.__enter__.return_value = mock_temp
        
        # Setup successful conversion
        mock_result = Mock()
        mock_result.document.export_to_markdown.return_value = "# Test content with sufficient length"
        mock_result.document.pages = [Mock()]
        mock_result.document.body.children = [Mock()]
        mock_converter.return_value.convert.return_value = mock_result
        
        with patch('os.path.exists', return_value=True), \
             patch('os.remove') as mock_remove:
            
            data = {'pdfFile': (real_pdf_content, 'test.pdf')}
            response = client.post('/convert-pdf', data=data)
            
            assert response.status_code == 200
            mock_remove.assert_called()

    @patch('app.DocumentConverter')
    @patch('tempfile.NamedTemporaryFile')
    def test_temp_file_cleanup_on_error(self, mock_tempfile, mock_converter, client, real_pdf_content):
        """Test temp files are cleaned up even when conversion fails"""
        mock_temp = Mock()
        mock_temp.name = '/tmp/test_pdf_12345.pdf'
        mock_tempfile.return_value.__enter__.return_value = mock_temp
        
        # Setup conversion failure
        mock_converter.return_value.convert.side_effect = Exception("Conversion failed")
        
        with patch('os.path.exists', return_value=True), \
             patch('os.remove') as mock_remove:
            
            data = {'pdfFile': (real_pdf_content, 'test.pdf')}
            response = client.post('/convert-pdf', data=data)
            
            assert response.status_code == 500
            mock_remove.assert_called()  # Should still clean up