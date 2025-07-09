#!/usr/bin/env python3
"""
Simple working test for OCR endpoint
"""
import requests
import os
import time

def test_ocr_endpoint():
    """Test the OCR endpoint and show results"""
    
    print("🧪 Testing OCR Endpoint with Enhanced Logging")
    print("=" * 50)
    
    # Check if server is running
    try:
        response = requests.get("http://localhost:5000/", timeout=2)
        print("✅ Server is responding")
    except:
        print("❌ Server not responding on localhost:5000")
        print("Please ensure Flask server is running: python app.py")
        return False
    
    # Check if PDF exists
    pdf_path = "data/AIF-C01-Q1-50-no-answers.pdf"
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return False
    
    print(f"📄 PDF found: {pdf_path}")
    print(f"📊 File size: {os.path.getsize(pdf_path):,} bytes")
    
    # Test OCR endpoint
    print("\n⏳ Sending OCR request (this will take 10-30 seconds)...")
    print("💡 Check the Flask server console for detailed OpenAI response logging!")
    
    try:
        with open(pdf_path, 'rb') as f:
            files = {'pdfFile': f}
            data = {'pageNumber': '1'}
            
            start_time = time.time()
            response = requests.post(
                "http://localhost:5000/convert-pdf-ocr",
                files=files,
                data=data,
                timeout=120
            )
            end_time = time.time()
            
            print(f"\n📡 Response received in {end_time - start_time:.1f} seconds")
            print(f"📊 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                markdown = result.get('markdown', '')
                
                print("✅ OCR SUCCESS!")
                print(f"📝 Generated: {len(markdown):,} characters")
                print("\n📄 First 300 characters of result:")
                print("-" * 40)
                print(markdown[:300] + "..." if len(markdown) > 300 else markdown)
                print("-" * 40)
                
                # Save result
                with open("test_ocr_result.md", "w") as f:
                    f.write(markdown)
                print(f"\n💾 Full result saved to: test_ocr_result.md")
                
                return True
            else:
                print(f"❌ OCR FAILED: {response.status_code}")
                try:
                    error = response.json().get('error', 'Unknown error')
                    print(f"Error: {error}")
                except:
                    print(f"Raw response: {response.text}")
                return False
                
    except requests.exceptions.Timeout:
        print("❌ Request timed out (>120 seconds)")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def show_logging_info():
    """Show information about the enhanced logging"""
    print("\n" + "="*50)
    print("🔍 ENHANCED LOGGING FEATURES")
    print("="*50)
    print("The Flask server console now shows:")
    print("• OpenAI model used (gpt-4o)")
    print("• Token usage (prompt + completion + total)")
    print("• Response finish reason (stop/length/etc)")
    print("• Content length in characters")
    print("• Preview of first 200 characters")
    print("• Complete extracted markdown content")
    print("• Processing success/failure status")
    print("\n💡 Watch the Flask server terminal while running this test!")

if __name__ == "__main__":
    show_logging_info()
    success = test_ocr_endpoint()
    
    print("\n" + "="*50)
    print("📋 TEST SUMMARY")
    print("="*50)
    if success:
        print("✅ OCR endpoint is working correctly!")
        print("🎉 Enhanced logging is now active in the Flask server.")
        print("📊 Check the server console for detailed OpenAI response data.")
    else:
        print("❌ OCR test failed.")
        print("🔧 Check server status and API key configuration.")
    
    print("\n🚀 Next steps:")
    print("• Use the web interface 'AI OCR Conversion' button")
    print("• Monitor server logs for debugging")
    print("• Track token usage for cost management")
