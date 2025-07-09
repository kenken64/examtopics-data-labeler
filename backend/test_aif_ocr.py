#!/usr/bin/env python3
"""
Test script for the OCR endpoint using AIF-C01-Q1-50-no-answers.pdf page 2
"""
import requests
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_ocr_with_aif_pdf():
    """Test OCR endpoint with the specific AIF PDF file and page 2"""
    
    url = "http://localhost:5000/convert-pdf-ocr"
    pdf_path = "data/AIF-C01-Q1-50-no-answers.pdf"
    page_number = 2
    
    print("🧪 Testing OCR Endpoint with AIF PDF")
    print("=" * 50)
    print(f"📄 PDF File: {pdf_path}")
    print(f"📃 Page Number: {page_number}")
    print(f"🔗 Endpoint: {url}")
    print("")
    
    # Check if PDF file exists
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        print("Please make sure the file exists in the backend/data/ directory")
        return False
    
    # Check file size
    file_size = os.path.getsize(pdf_path)
    print(f"📊 File size: {file_size:,} bytes ({file_size/1024/1024:.2f} MB)")
    
    # Check if API key is available
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
        return False
    
    print(f"🔑 API Key: {api_key[:10]}...{api_key[-4:]} (loaded from .env)")
    print("")
    
    try:
        print("⏳ Sending OCR request...")
        print("   Note: This may take 10-30 seconds for AI processing...")
        
        with open(pdf_path, 'rb') as f:
            files = {'pdfFile': f}
            data = {'pageNumber': str(page_number)}
            
            # Set a longer timeout for OCR processing
            response = requests.post(url, files=files, data=data, timeout=120)
            
            print(f"📡 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                markdown_content = result.get('markdown', '')
                
                print("✅ OCR conversion successful!")
                print(f"📝 Generated {len(markdown_content):,} characters of markdown")
                print("")
                print("=" * 50)
                print("📄 EXTRACTED CONTENT (Page 2)")
                print("=" * 50)
                print(markdown_content)
                print("=" * 50)
                print("")
                
                # Save result to file for inspection
                output_file = f"ocr_result_page_{page_number}.md"
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(f"# OCR Result for AIF-C01-Q1-50-no-answers.pdf - Page {page_number}\n\n")
                    f.write(markdown_content)
                
                print(f"💾 Result saved to: {output_file}")
                return True
                
            else:
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', 'Unknown error')
                except:
                    error_message = response.text
                
                print(f"❌ OCR conversion failed!")
                print(f"Error: {error_message}")
                return False
                
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed!")
        print("Make sure the Flask server is running:")
        print("   cd backend && source venv/bin/activate && python app.py")
        return False
        
    except requests.exceptions.Timeout:
        print("❌ Request timed out!")
        print("OCR processing can take a while. The server might still be processing.")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_server_status():
    """Quick test to see if server is responding"""
    try:
        response = requests.get("http://localhost:5000/", timeout=5)
        return True
    except:
        return False

if __name__ == "__main__":
    print("🚀 OCR Endpoint Test - AIF PDF Page 2")
    print("====================================")
    
    # Check if server is running
    if not test_server_status():
        print("❌ Flask server is not responding on http://localhost:5000")
        print("Please start the server first:")
        print("   cd backend && source venv/bin/activate && python app.py")
        sys.exit(1)
    
    print("✅ Server is responding")
    print("")
    
    # Run the OCR test
    success = test_ocr_with_aif_pdf()
    
    print("")
    print("📊 Test Summary:")
    if success:
        print("✅ OCR conversion completed successfully!")
        print("🎉 The endpoint is working correctly with the AIF PDF file.")
    else:
        print("❌ OCR conversion failed.")
        print("Check the error messages above for troubleshooting.")
