"""
Unit tests for Flask application endpoints
"""
import pytest
import json
import tempfile
import os
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO
from PIL import Image
import base64


class TestHealthEndpoints:
    """Test health and info endpoints"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert data['service'] == 'examtopics-backend'
        assert 'version' in data
        assert 'environment' in data

    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get('/')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['service'] == 'ExamTopics Data Labeler Backend'
        assert 'endpoints' in data
        assert len(data['endpoints']) >= 3


class TestPDFConversionEndpoint:
    """Test /convert-pdf endpoint"""
    
    def test_convert_pdf_no_file(self, client):
        """Test conversion without file"""
        response = client.post('/convert-pdf')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'No pdfFile part' in data['error']

    def test_convert_pdf_empty_filename(self, client):
        """Test conversion with empty filename"""
        data = {'pdfFile': (BytesIO(b''), '')}
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'No selected file' in data['error']

    def test_convert_pdf_invalid_page_number(self, client, sample_pdf_file):
        """Test conversion with invalid page number"""
        data = {
            'pdfFile': (sample_pdf_file, 'test.pdf'),
            'pageNumber': 'invalid'
        }
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid pageNumber' in data['error']

    @patch('app.DocumentConverter')
    @patch('app.PdfReader')
    def test_convert_pdf_success(self, mock_reader, mock_converter, client, sample_pdf_file):
        """Test successful PDF conversion"""
        # Setup mocks
        mock_result = Mock()
        mock_result.document.export_to_markdown.return_value = "# Test Document\n\nSample content with sufficient length to pass validation."
        mock_result.document.pages = [Mock()]
        mock_result.document.body.children = [Mock(), Mock()]
        mock_converter.return_value.convert.return_value = mock_result
        
        mock_page = Mock()
        mock_reader.return_value.pages = [mock_page]
        
        data = {'pdfFile': (sample_pdf_file, 'test.pdf')}
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'markdown' in data
        assert len(data['markdown']) > 20

    @patch('app.DocumentConverter')
    def test_convert_pdf_empty_content(self, mock_converter, client, sample_pdf_file):
        """Test PDF conversion with empty content"""
        mock_result = Mock()
        mock_result.document.export_to_markdown.return_value = ""
        mock_converter.return_value.convert.return_value = mock_result
        
        data = {'pdfFile': (sample_pdf_file, 'test.pdf')}
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'No markdown content found' in data['error']

    @patch('app.DocumentConverter')
    def test_convert_pdf_with_page_number(self, mock_converter, client, sample_pdf_file, mock_pypdf_reader, mock_pypdf_writer):
        """Test PDF conversion with specific page number"""
        mock_result = Mock()
        mock_result.document.export_to_markdown.return_value = "# Page Content\n\nSpecific page content with adequate length."
        mock_result.document.pages = [Mock()]
        mock_result.document.body.children = [Mock()]
        mock_converter.return_value.convert.return_value = mock_result
        
        data = {
            'pdfFile': (sample_pdf_file, 'test.pdf'),
            'pageNumber': '1'
        }
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'markdown' in data

    @patch('app.DocumentConverter')
    @patch('app.PdfReader')
    def test_convert_pdf_page_out_of_bounds(self, mock_reader, mock_converter, client, sample_pdf_file):
        """Test PDF conversion with page number out of bounds"""
        mock_reader.return_value.pages = [Mock()]  # Only 1 page
        
        data = {
            'pdfFile': (sample_pdf_file, 'test.pdf'),
            'pageNumber': '5'  # Request page 5 when only 1 page exists
        }
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'out of bounds' in data['error']

    @patch('app.DocumentConverter')
    def test_convert_pdf_conversion_error(self, mock_converter, client, sample_pdf_file):
        """Test PDF conversion with docling error"""
        mock_converter.return_value.convert.side_effect = Exception("Conversion failed")
        
        data = {'pdfFile': (sample_pdf_file, 'test.pdf')}
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'Error during PDF conversion' in data['error']


class TestPDFOCREndpoint:
    """Test /convert-pdf-ocr endpoint"""
    
    def test_ocr_no_file(self, client):
        """Test OCR without file"""
        response = client.post('/convert-pdf-ocr')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'No pdfFile part' in data['error']

    def test_ocr_empty_filename(self, client):
        """Test OCR with empty filename"""
        data = {'pdfFile': (BytesIO(b''), '')}
        response = client.post('/convert-pdf-ocr', data=data)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'No selected file' in data['error']

    @patch.dict(os.environ, {}, clear=True)
    def test_ocr_no_api_key(self, client, sample_pdf_file):
        """Test OCR without OpenAI API key"""
        data = {'pdfFile': (sample_pdf_file, 'test.pdf')}
        response = client.post('/convert-pdf-ocr', data=data)
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'OpenAI API key not configured' in data['error']

    @patch('app.convert_from_path')
    @patch('app.OpenAI')
    def test_ocr_success(self, mock_openai, mock_pdf2image, client, sample_pdf_file, mock_environment):
        """Test successful OCR conversion"""
        # Setup pdf2image mock
        sample_image = Image.new('RGB', (800, 600), color='white')
        mock_pdf2image.return_value = [sample_image]
        
        # Setup OpenAI mock
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "# Extracted Text\n\nThis is text extracted from the image."
        mock_response.choices[0].finish_reason = "stop"
        mock_response.model = "gpt-4o"
        mock_response.usage = Mock()
        mock_openai.return_value.chat.completions.create.return_value = mock_response
        
        data = {'pdfFile': (sample_pdf_file, 'test.pdf')}
        response = client.post('/convert-pdf-ocr', data=data)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'markdown' in data
        assert 'Extracted Text' in data['markdown']

    @patch('app.convert_from_path')
    def test_ocr_no_images_generated(self, mock_pdf2image, client, sample_pdf_file, mock_environment):
        """Test OCR when no images are generated"""
        mock_pdf2image.return_value = []
        
        data = {'pdfFile': (sample_pdf_file, 'test.pdf')}
        response = client.post('/convert-pdf-ocr', data=data)
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'Failed to convert PDF to images' in data['error']

    @patch('app.convert_from_path')
    @patch('app.OpenAI')
    def test_ocr_openai_error(self, mock_openai, mock_pdf2image, client, sample_pdf_file, mock_environment):
        """Test OCR with OpenAI API error"""
        sample_image = Image.new('RGB', (800, 600), color='white')
        mock_pdf2image.return_value = [sample_image]
        
        mock_openai.return_value.chat.completions.create.side_effect = Exception("API Error")
        
        data = {'pdfFile': (sample_pdf_file, 'test.pdf')}
        response = client.post('/convert-pdf-ocr', data=data)
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'Failed to extract text from images' in data['error']

    @patch('app.convert_from_path')
    @patch('app.OpenAI')
    def test_ocr_multiple_images(self, mock_openai, mock_pdf2image, client, sample_pdf_file, mock_environment):
        """Test OCR with multiple images"""
        # Setup multiple images
        images = [
            Image.new('RGB', (800, 600), color='white'),
            Image.new('RGB', (800, 600), color='lightgray')
        ]
        mock_pdf2image.return_value = images
        
        # Setup OpenAI responses
        responses = [
            "# Page 1\n\nFirst page content.",
            "# Page 2\n\nSecond page content."
        ]
        
        mock_response_objs = []
        for resp in responses:
            mock_resp = Mock()
            mock_resp.choices = [Mock()]
            mock_resp.choices[0].message.content = resp
            mock_resp.choices[0].finish_reason = "stop"
            mock_resp.model = "gpt-4o"
            mock_resp.usage = Mock()
            mock_response_objs.append(mock_resp)
        
        mock_openai.return_value.chat.completions.create.side_effect = mock_response_objs
        
        data = {'pdfFile': (sample_pdf_file, 'test.pdf')}
        response = client.post('/convert-pdf-ocr', data=data)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'markdown' in data
        assert 'Page 1' in data['markdown']
        assert 'Page 2' in data['markdown']
        assert '---' in data['markdown']  # Page separator

    @patch('app.convert_from_path')
    @patch('app.OpenAI')
    @patch('app.PdfReader')
    def test_ocr_with_page_number(self, mock_reader, mock_openai, mock_pdf2image, client, sample_pdf_file, mock_environment, mock_pypdf_writer):
        """Test OCR with specific page number"""
        mock_reader.return_value.pages = [Mock(), Mock(), Mock()]  # 3 pages
        
        sample_image = Image.new('RGB', (800, 600), color='white')
        mock_pdf2image.return_value = [sample_image]
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "# Page 2 Content\n\nSpecific page content."
        mock_response.choices[0].finish_reason = "stop"
        mock_response.model = "gpt-4o"
        mock_response.usage = Mock()
        mock_openai.return_value.chat.completions.create.return_value = mock_response
        
        data = {
            'pdfFile': (sample_pdf_file, 'test.pdf'),
            'pageNumber': '2'
        }
        response = client.post('/convert-pdf-ocr', data=data)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'markdown' in data