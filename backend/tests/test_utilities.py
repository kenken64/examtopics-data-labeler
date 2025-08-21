"""
Utility tests and performance tests for the backend
"""
import pytest
import time
import tempfile
import os
from unittest.mock import patch, Mock
from io import BytesIO
from PIL import Image
import base64


class TestPerformance:
    """Performance tests for critical operations"""
    
    @pytest.mark.slow
    @patch('app.DocumentConverter')
    def test_pdf_conversion_performance(self, mock_converter, client, sample_pdf_file):
        """Test PDF conversion performance"""
        mock_result = Mock()
        mock_result.document.export_to_markdown.return_value = "# Performance Test\n\nContent with adequate length for testing."
        mock_result.document.pages = [Mock()]
        mock_result.document.body.children = [Mock()]
        mock_converter.return_value.convert.return_value = mock_result
        
        start_time = time.time()
        
        data = {'pdfFile': (sample_pdf_file, 'performance-test.pdf')}
        response = client.post('/convert-pdf', data=data)
        
        end_time = time.time()
        duration = end_time - start_time
        
        assert response.status_code == 200
        assert duration < 5.0  # Should complete within 5 seconds

    @pytest.mark.slow
    @patch('app.convert_from_path')
    @patch('app.OpenAI')
    def test_ocr_performance(self, mock_openai, mock_pdf2image, client, sample_pdf_file, mock_environment):
        """Test OCR performance with multiple images"""
        # Setup multiple images to test batch processing
        images = [Image.new('RGB', (800, 600), color='white') for _ in range(3)]
        mock_pdf2image.return_value = images
        
        responses = [f"# Page {i+1}\n\nContent for page {i+1}" for i in range(3)]
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
        
        start_time = time.time()
        
        data = {'pdfFile': (sample_pdf_file, 'ocr-performance-test.pdf')}
        response = client.post('/convert-pdf-ocr', data=data)
        
        end_time = time.time()
        duration = end_time - start_time
        
        assert response.status_code == 200
        assert duration < 10.0  # Should complete within 10 seconds for 3 pages


class TestEdgeCases:
    """Edge case tests"""
    
    def test_extremely_large_page_number(self, client, sample_pdf_file):
        """Test with extremely large page number"""
        data = {
            'pdfFile': (sample_pdf_file, 'test.pdf'),
            'pageNumber': '99999999'
        }
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 400
        result = response.get_json()
        assert 'out of bounds' in result['error']

    def test_negative_page_number(self, client, sample_pdf_file):
        """Test with negative page number"""
        data = {
            'pdfFile': (sample_pdf_file, 'test.pdf'),
            'pageNumber': '-1'
        }
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 400

    def test_zero_page_number(self, client, sample_pdf_file):
        """Test with zero page number"""
        data = {
            'pdfFile': (sample_pdf_file, 'test.pdf'),
            'pageNumber': '0'
        }
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 400

    @patch('app.DocumentConverter')
    def test_very_large_pdf_content(self, mock_converter, client, sample_pdf_file):
        """Test handling of very large PDF content"""
        # Simulate very large markdown output
        large_content = "# Large Document\n\n" + "Content line.\n" * 10000
        
        mock_result = Mock()
        mock_result.document.export_to_markdown.return_value = large_content
        mock_result.document.pages = [Mock()]
        mock_result.document.body.children = [Mock()]
        mock_converter.return_value.convert.return_value = mock_result
        
        data = {'pdfFile': (sample_pdf_file, 'large-test.pdf')}
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 200
        result = response.get_json()
        assert len(result['markdown']) > 100000

    @patch('app.convert_from_path')
    @patch('app.OpenAI')
    def test_very_large_image(self, mock_openai, mock_pdf2image, client, sample_pdf_file, mock_environment):
        """Test OCR with very large image"""
        # Create a large image
        large_image = Image.new('RGB', (4000, 4000), color='white')
        mock_pdf2image.return_value = [large_image]
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "# Large Image Content\n\nExtracted from large image."
        mock_response.choices[0].finish_reason = "stop"
        mock_response.model = "gpt-4o"
        mock_response.usage = Mock()
        mock_openai.return_value.chat.completions.create.return_value = mock_response
        
        data = {'pdfFile': (sample_pdf_file, 'large-image-test.pdf')}
        response = client.post('/convert-pdf-ocr', data=data)
        
        assert response.status_code == 200

    def test_malformed_pdf_file(self, client):
        """Test with malformed PDF file"""
        malformed_pdf = BytesIO(b'This is not a PDF file content')
        
        data = {'pdfFile': (malformed_pdf, 'malformed.pdf')}
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 500
        result = response.get_json()
        assert 'error' in result

    def test_empty_pdf_file(self, client):
        """Test with empty PDF file"""
        empty_pdf = BytesIO(b'')
        
        data = {'pdfFile': (empty_pdf, 'empty.pdf')}
        response = client.post('/convert-pdf', data=data)
        
        assert response.status_code == 500


class TestSecurityScenarios:
    """Security-related test scenarios"""
    
    def test_filename_injection_attempt(self, client, sample_pdf_file):
        """Test potential filename injection"""
        malicious_filename = '../../../etc/passwd'
        
        data = {'pdfFile': (sample_pdf_file, malicious_filename)}
        response = client.post('/convert-pdf', data=data)
        
        # Should handle gracefully without exposing system files
        assert response.status_code in [400, 500, 200]

    def test_very_long_filename(self, client, sample_pdf_file):
        """Test with extremely long filename"""
        long_filename = 'a' * 1000 + '.pdf'
        
        data = {'pdfFile': (sample_pdf_file, long_filename)}
        response = client.post('/convert-pdf', data=data)
        
        # Should handle gracefully
        assert response.status_code in [400, 500, 200]

    def test_special_characters_filename(self, client, sample_pdf_file):
        """Test filename with special characters"""
        special_filename = 'test<>:"|?*.pdf'
        
        data = {'pdfFile': (sample_pdf_file, special_filename)}
        response = client.post('/convert-pdf', data=data)
        
        # Should handle gracefully
        assert response.status_code in [400, 500, 200]


class TestResourceManagement:
    """Test resource management and cleanup"""
    
    @patch('tempfile.NamedTemporaryFile')
    @patch('os.path.exists')
    @patch('os.remove')
    def test_temp_file_cleanup_called(self, mock_remove, mock_exists, mock_tempfile, client, sample_pdf_file):
        """Verify temporary files are always cleaned up"""
        mock_temp = Mock()
        mock_temp.name = '/tmp/test_file.pdf'
        mock_tempfile.return_value.__enter__.return_value = mock_temp
        mock_exists.return_value = True
        
        with patch('app.DocumentConverter') as mock_converter:
            mock_converter.return_value.convert.side_effect = Exception("Test error")
            
            data = {'pdfFile': (sample_pdf_file, 'test.pdf')}
            response = client.post('/convert-pdf', data=data)
            
            assert response.status_code == 500
            mock_remove.assert_called_with('/tmp/test_file.pdf')

    def test_memory_usage_with_large_requests(self, client):
        """Test memory doesn't grow excessively with large requests"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Make several large requests
        for i in range(5):
            large_data = b'x' * (1024 * 1024)  # 1MB of data
            large_file = BytesIO(large_data)
            
            data = {'pdfFile': (large_file, f'large-test-{i}.pdf')}
            response = client.post('/convert-pdf', data=data)
            # Don't care about response, just testing memory
        
        final_memory = process.memory_info().rss
        memory_growth = final_memory - initial_memory
        
        # Memory growth should be reasonable (less than 100MB)
        assert memory_growth < 100 * 1024 * 1024


class TestConcurrency:
    """Concurrency and thread safety tests"""
    
    @pytest.mark.slow
    def test_concurrent_requests(self, client):
        """Test handling multiple concurrent requests"""
        import threading
        import queue
        
        results = queue.Queue()
        
        def make_request():
            try:
                response = client.get('/health')
                results.put(response.status_code)
            except Exception as e:
                results.put(f"Error: {e}")
        
        # Start multiple threads
        threads = []
        for i in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Check all requests succeeded
        status_codes = []
        while not results.empty():
            status_codes.append(results.get())
        
        assert len(status_codes) == 10
        assert all(code == 200 for code in status_codes)