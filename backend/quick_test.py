#!/usr/bin/env python3
"""
Quick test to see OpenAI response details in OCR endpoint
"""
import requests
import time

def quick_test():
    # Start with a simple health check
    try:
        response = requests.get("http://localhost:5000/", timeout=2)
        print("✅ Server is responding")
    except:
        print("❌ Server not responding")
        return
    
    print("🧪 Testing OCR endpoint...")
    
    # Test with a very simple request
    with open("data/AIF-C01-Q1-50-no-answers.pdf", "rb") as f:
        files = {'pdfFile': f}
        data = {'pageNumber': '1'}
        
        try:
            print("⏳ Sending OCR request...")
            response = requests.post(
                "http://localhost:5000/convert-pdf-ocr", 
                files=files, 
                data=data, 
                timeout=60
            )
            
            print(f"📡 Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Success! Generated {len(result['markdown'])} characters")
                print("📄 First 300 chars:")
                print(result['markdown'][:300] + "...")
            else:
                print(f"❌ Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {e}")

if __name__ == "__main__":
    quick_test()
