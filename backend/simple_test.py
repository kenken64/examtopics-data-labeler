#!/usr/bin/env python3
"""
Simple OCR test to see OpenAI response details
"""
import requests
import os
from dotenv import load_dotenv

load_dotenv()

def simple_ocr_test():
    url = "http://localhost:5000/convert-pdf-ocr"
    pdf_path = "data/AIF-C01-Q1-50-no-answers.pdf"
    
    print("🧪 Simple OCR Test - Page 1")
    print(f"📄 File: {pdf_path}")
    
    if not os.path.exists(pdf_path):
        print(f"❌ File not found: {pdf_path}")
        return
    
    with open(pdf_path, 'rb') as f:
        files = {'pdfFile': f}
        data = {'pageNumber': '1'}  # Test with page 1
        
        try:
            print("⏳ Sending request...")
            response = requests.post(url, files=files, data=data, timeout=60)
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Success!")
                print(f"Generated: {len(result['markdown'])} characters")
            else:
                print(f"❌ Failed: {response.status_code}")
                print(response.text)
                
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    simple_ocr_test()
