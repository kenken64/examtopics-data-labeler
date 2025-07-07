#!/usr/bin/env python3

import sys
import os
from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend

def test_enhanced_pdf_conversion(pdf_path):
    """Test PDF conversion with enhanced options for image-heavy PDFs"""
    
    print(f"Testing enhanced PDF conversion for: {pdf_path}")
    
    # Check if file exists
    if not os.path.exists(pdf_path):
        print(f"ERROR: File does not exist: {pdf_path}")
        return False
    
    # Check file size
    file_size = os.path.getsize(pdf_path)
    print(f"File size: {file_size} bytes")
    
    try:
        # Initialize converter with enhanced pipeline options
        print("Initializing DocumentConverter with enhanced options...")
        
        # Configure pipeline options for better OCR and image handling
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = True  # Enable OCR for image-based text
        pipeline_options.do_table_structure = True  # Enable table structure detection
        pipeline_options.table_structure_options.do_cell_matching = True
        
        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: pipeline_options
            }
        )
        
        # Convert the document
        print("Converting document with OCR enabled...")
        result = converter.convert(pdf_path)
        
        # Print document info
        print(f"Document pages: {len(result.document.pages)}")
        print(f"Document elements: {len(result.document.body.children) if result.document.body else 0}")
        
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
            print(f"WARNING: Only generated {len(markdown_content) if markdown_content else 0} characters of markdown")
            if markdown_content:
                print("Content:", repr(markdown_content))
            
            # Try to extract page text directly
            print("\nTrying to extract text from pages directly...")
            for i, page in enumerate(result.document.pages):
                print(f"Page {i+1} elements: {len(page.children) if page.children else 0}")
                if page.children:
                    for j, element in enumerate(page.children[:3]):  # Show first 3 elements
                        print(f"  Element {j+1}: {type(element).__name__}")
                        if hasattr(element, 'text'):
                            print(f"    Text: {element.text[:100] if element.text else 'No text'}...")
            
            return False
            
    except Exception as e:
        print(f"ERROR during conversion: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test_enhanced_pdf_conversion.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    success = test_enhanced_pdf_conversion(pdf_path)
    sys.exit(0 if success else 1)
