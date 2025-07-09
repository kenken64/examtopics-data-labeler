#!/usr/bin/env python3

import sys
import os
from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions

def test_ocr_pdf_conversion(pdf_path):
    """Test PDF conversion with OCR enabled"""
    
    print(f"Testing OCR PDF conversion for: {pdf_path}")
    
    # Check if file exists
    if not os.path.exists(pdf_path):
        print(f"ERROR: File does not exist: {pdf_path}")
        return False
    
    # Check file size
    file_size = os.path.getsize(pdf_path)
    print(f"File size: {file_size} bytes")
    
    try:
        # Initialize converter with OCR enabled
        print("Initializing DocumentConverter with OCR enabled...")
        
        # Configure pipeline options for OCR
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = True  # Enable OCR for image-based text
        
        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: pipeline_options
            }
        )
        
        # Convert the document
        print("Converting document with OCR...")
        result = converter.convert(pdf_path)
        
        # Print document info
        print(f"Document pages: {len(result.document.pages)}")
        
        # Check what we have in the document
        if result.document.body and result.document.body.children:
            print(f"Document body elements: {len(result.document.body.children)}")
            for i, element in enumerate(result.document.body.children[:5]):  # Show first 5 elements
                print(f"  Element {i+1}: {type(element).__name__}")
                if hasattr(element, 'text') and element.text:
                    print(f"    Text preview: {element.text[:100]}...")
        
        # Export to markdown
        print("Exporting to markdown...")
        markdown_content = result.document.export_to_markdown()
        
        if markdown_content and len(markdown_content.strip()) > 50:  # More than just image comments
            print(f"SUCCESS: Generated meaningful markdown content ({len(markdown_content)} characters)")
            print("First 1000 characters of markdown:")
            print("-" * 50)
            print(markdown_content[:1000])
            print("-" * 50)
            return True
        else:
            print(f"LIMITED SUCCESS: Only generated {len(markdown_content) if markdown_content else 0} characters of markdown")
            if markdown_content:
                print("Full content:", repr(markdown_content))
            return False
            
    except Exception as e:
        print(f"ERROR during conversion: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test_ocr_pdf_conversion.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    success = test_ocr_pdf_conversion(pdf_path)
    sys.exit(0 if success else 1)
