#!/usr/bin/env python3

import sys
import os
from docling.document_converter import DocumentConverter

def test_pdf_conversion(pdf_path):
    """Test PDF conversion with detailed error reporting"""
    
    print(f"Testing PDF conversion for: {pdf_path}")
    
    # Check if file exists
    if not os.path.exists(pdf_path):
        print(f"ERROR: File does not exist: {pdf_path}")
        return False
    
    # Check file size
    file_size = os.path.getsize(pdf_path)
    print(f"File size: {file_size} bytes")
    
    try:
        # Initialize converter
        print("Initializing DocumentConverter...")
        converter = DocumentConverter()
        
        # Convert the document
        print("Converting document...")
        result = converter.convert(pdf_path)
        
        # Export to markdown
        print("Exporting to markdown...")
        markdown_content = result.document.export_to_markdown()
        
        if markdown_content:
            print(f"SUCCESS: Generated markdown content ({len(markdown_content)} characters)")
            print("First 500 characters of markdown:")
            print("-" * 50)
            print(markdown_content[:500])
            print("-" * 50)
            return True
        else:
            print("ERROR: No markdown content generated")
            return False
            
    except Exception as e:
        print(f"ERROR during conversion: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test_pdf_conversion.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    success = test_pdf_conversion(pdf_path)
    sys.exit(0 if success else 1)
