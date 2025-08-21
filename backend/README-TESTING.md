# Backend Testing Guide

This document describes the comprehensive test suite for the ExamTopics Data Labeler backend.

## Test Structure

```
tests/
├── __init__.py
├── conftest.py              # Pytest configuration and base fixtures
├── test_app.py             # Unit tests for Flask endpoints
├── test_integration.py     # Integration tests for full workflows
├── test_utilities.py       # Performance and edge case tests
└── test_fixtures.py        # Additional fixtures and factories
```

## Test Categories

### Unit Tests (`test_app.py`)
- **Health Endpoints**: `/health` and `/` endpoint testing
- **PDF Conversion**: `/convert-pdf` endpoint with various scenarios
- **OCR Processing**: `/convert-pdf-ocr` endpoint testing
- **Error Handling**: Invalid inputs, missing files, API failures

### Integration Tests (`test_integration.py`)
- **Full Workflows**: Complete PDF processing pipelines
- **Multi-page PDFs**: End-to-end processing of complex documents
- **CORS Testing**: Cross-origin request handling
- **Resource Cleanup**: Temporary file management

### Utility Tests (`test_utilities.py`)
- **Performance Tests**: Response time validation
- **Edge Cases**: Large files, malformed inputs, security scenarios
- **Concurrency**: Multi-threaded request handling
- **Memory Management**: Resource usage monitoring

## Running Tests

### Prerequisites

```bash
cd backend
pip install -r requirements.txt
pip install -r requirements-test.txt
```

### Basic Test Commands

```bash
# Run all tests (excluding slow ones)
make test

# Run unit tests only
make test-unit

# Run integration tests only
make test-integration

# Run all tests including slow ones
make test-all

# Run with coverage report
make coverage
```

### Advanced Testing

```bash
# Run specific test file
pytest tests/test_app.py -v

# Run specific test class
pytest tests/test_app.py::TestPDFConversionEndpoint -v

# Run specific test method
pytest tests/test_app.py::TestPDFConversionEndpoint::test_convert_pdf_success -v

# Run tests with specific markers
pytest -m "not slow" -v
pytest -m "integration" -v
pytest -m "external" -v

# Run tests in parallel
pytest -n 4 tests/
```

## Test Markers

- `@pytest.mark.unit`: Unit tests
- `@pytest.mark.integration`: Integration tests
- `@pytest.mark.slow`: Tests that take longer to run
- `@pytest.mark.external`: Tests requiring external services

## Test Fixtures

### PDF Fixtures
- `sample_pdf_file`: Basic PDF for testing
- `sample_exam_pdf`: PDF with exam question format
- `sample_multipage_pdf`: Multi-page PDF document
- `large_pdf_content`: Large PDF for performance testing

### Image Fixtures
- `sample_image`: Basic PIL image
- `sample_text_image`: Image with text content
- `sample_exam_image`: Image formatted like exam question

### Mock Fixtures
- `mock_openai`: Mocked OpenAI API responses
- `mock_docling_converter`: Mocked document converter
- `mock_pdf2image`: Mocked PDF to image conversion

## Environment Variables

Set these for testing:

```bash
export OPENAI_API_KEY=test-key-for-testing
export FLASK_ENV=testing
export FLASK_DEBUG=true
```

## Coverage Reports

After running tests with coverage:

```bash
# View HTML coverage report
open htmlcov/index.html

# View terminal coverage summary
make coverage
```

## Continuous Integration

Tests run automatically on:
- Push to `q-labeler` or `master` branches
- Pull requests to `master`
- Changes to backend files

CI includes:
- Multi-Python version testing (3.9, 3.10, 3.11)
- Code linting with flake8
- Type checking with mypy
- Security scanning with bandit and safety
- Coverage reporting

## Writing New Tests

### Test Structure

```python
class TestNewFeature:
    """Test description"""
    
    def test_basic_functionality(self, client):
        """Test basic case"""
        response = client.get('/new-endpoint')
        assert response.status_code == 200
    
    def test_error_handling(self, client):
        """Test error case"""
        response = client.post('/new-endpoint', data={})
        assert response.status_code == 400
    
    @pytest.mark.slow
    def test_performance(self, client):
        """Performance test"""
        start_time = time.time()
        response = client.post('/new-endpoint', data=large_data)
        duration = time.time() - start_time
        assert duration < 5.0
```

### Best Practices

1. **Use descriptive test names**: `test_convert_pdf_with_invalid_page_number`
2. **Test both success and failure cases**
3. **Mock external dependencies**: OpenAI API, file system operations
4. **Clean up resources**: Use fixtures for temporary files
5. **Add appropriate markers**: `@pytest.mark.slow` for long tests
6. **Test edge cases**: Empty files, large files, malformed input
7. **Verify error messages**: Check that error responses are helpful

### Performance Testing

```python
@pytest.mark.slow
def test_large_file_processing(self, client, large_pdf_content):
    """Test processing of large files"""
    start_time = time.time()
    
    data = {'pdfFile': (large_pdf_content, 'large.pdf')}
    response = client.post('/convert-pdf', data=data)
    
    duration = time.time() - start_time
    assert response.status_code == 200
    assert duration < 10.0  # Should complete within 10 seconds
```

### Security Testing

```python
def test_filename_security(self, client, sample_pdf_file):
    """Test protection against path traversal"""
    malicious_filename = '../../../etc/passwd'
    
    data = {'pdfFile': (sample_pdf_file, malicious_filename)}
    response = client.post('/convert-pdf', data=data)
    
    # Should not expose system files
    assert response.status_code in [400, 500]
```

## Debugging Failed Tests

1. **Run with verbose output**: `pytest -v -s`
2. **Use pytest debugging**: `pytest --pdb`
3. **Check coverage gaps**: `make coverage`
4. **Review test logs**: Tests print detailed information
5. **Isolate failing test**: Run specific test method

## Test Data

Test PDFs and images are generated programmatically using:
- `reportlab` for PDF generation
- `PIL` for image creation
- Factory classes in `test_fixtures.py`

This ensures tests are self-contained and don't rely on external files.