#!/usr/bin/env python3
"""
Test script for the new PDF-to-OCR conversion endpoint
"""
import requests
import sys
import os

def test_ocr_endpoint():
    url = "http://localhost:5000/convert-pdf-ocr"
    
    # Check if test PDF exists
    test_pdf_path = "test.pdf"
    if not os.path.exists(test_pdf_path):
        print("❌ No test.pdf file found")
        print("Please place a test PDF file named 'test.pdf' in the backend directory")
        return False
    
    # Check if OpenAI API key is set
    if not os.environ.get('OPENAI_API_KEY'):
        print("❌ OPENAI_API_KEY not found")
        print("Setup options:")
        print("1. Run: ../setup_openai_key.sh")
        print("2. Create .env file with: OPENAI_API_KEY=sk-your_key_here")
        print("3. Set environment variable: export OPENAI_API_KEY=sk-your_key_here")
        return False
    
    print("🧪 Testing OCR endpoint...")
    print(f"📄 Using test file: {test_pdf_path}")
    print(f"🔗 Endpoint: {url}")
    
    try:
        with open(test_pdf_path, 'rb') as f:
            files = {'pdfFile': f}
            data = {'pageNumber': '1'}
            
            print("⏳ Sending request...")
            response = requests.post(url, files=files, data=data, timeout=120)
            
            if response.status_code == 200:
                result = response.json()
                markdown_content = result.get('markdown', '')
                
                print("✅ OCR conversion successful!")
                print(f"📝 Generated {len(markdown_content)} characters of markdown")
                print("\n--- First 500 characters of result ---")
                print(markdown_content[:500])
                if len(markdown_content) > 500:
                    print("... (truncated)")
                print("--- End of preview ---\n")
                return True
            else:
                error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
                print(f"❌ Request failed with status {response.status_code}")
                print(f"Error: {error_data.get('error', response.text)}")
                return False
                
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Is the Flask backend running on localhost:5000?")
        return False
    except requests.exceptions.Timeout:
        print("❌ Request timed out. OCR processing can take a while for complex documents.")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_standard_endpoint():
    url = "http://localhost:5000/convert-pdf"
    
    test_pdf_path = "test.pdf"
    if not os.path.exists(test_pdf_path):
        print("❌ No test.pdf file found for standard conversion test")
        return False
    
    print("🧪 Testing standard conversion endpoint...")
    
    try:
        with open(test_pdf_path, 'rb') as f:
            files = {'pdfFile': f}
            data = {'pageNumber': '1'}
            
            print("⏳ Sending request...")
            response = requests.post(url, files=files, data=data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                markdown_content = result.get('markdown', '')
                
                print("✅ Standard conversion successful!")
                print(f"📝 Generated {len(markdown_content)} characters of markdown")
                return True
            else:
                error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
                print(f"❌ Standard conversion failed with status {response.status_code}")
                print(f"Error: {error_data.get('error', response.text)}")
                return False
                
    except Exception as e:
        print(f"❌ Standard conversion error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 PDF Conversion Endpoints Test")
    print("=" * 40)
    
    # Test standard endpoint first
    standard_success = test_standard_endpoint()
    print()
    
    # Test OCR endpoint
    ocr_success = test_ocr_endpoint()
    print()
    
    print("📊 Test Results:")
    print(f"Standard Conversion: {'✅ PASS' if standard_success else '❌ FAIL'}")
    print(f"OCR Conversion: {'✅ PASS' if ocr_success else '❌ FAIL'}")
    
    if ocr_success and standard_success:
        print("\n🎉 All tests passed! The OCR endpoint is ready to use.")
    elif standard_success:
        print("\n⚠️ Standard conversion works, but OCR needs API key setup.")
    else:
        print("\n❌ Tests failed. Check server logs for details.")
