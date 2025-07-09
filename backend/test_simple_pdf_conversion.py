#!/usr/bin/env python3

import sys
import os
from docling.document_converter import DocumentConverter

def test_simple_pdf_conversion(pdf_path):
    """Test simple PDF conversion to understand what we're getting"""
    
    print(f"Testing simple PDF conversion for: {pdf_path}")
    
    # Check if file exists
    if not os.path.exists(pdf_path):
        print(f"ERROR: File does not exist: {pdf_path}")
        return False
    
    # Check file size
    file_size = os.path.getsize(pdf_path)
    print(f"File size: {file_size} bytes")
    
    try:
        # Initialize basic converter
        print("Initializing basic DocumentConverter...")
        converter = DocumentConverter()
        
        # Convert the document
        print("Converting document...")
        result = converter.convert(pdf_path)
        
        # Analyze the result
        print(f"Document pages: {len(result.document.pages) if result.document.pages else 0}")
        
        # Check document structure
        if result.document.body:
            print(f"Document body elements: {len(result.document.body.children) if result.document.body.children else 0}")
            if result.document.body.children:
                print("First few elements:")
                for i, element in enumerate(result.document.body.children[:3]):
                    print(f"  {i+1}. {type(element).__name__}")
                    if hasattr(element, 'text') and element.text:
                        print(f"     Text: {element.text[:100]}...")
        
        # Check pages directly
        if result.document.pages:
            print(f"\nPage analysis: {len(result.document.pages)} pages found")
            print(f"Pages type: {type(result.document.pages)}")
            try:
                # Try to access pages as a list/dict
                if hasattr(result.document.pages, 'items'):
                    # It's a dict-like object
                    for page_id, page in list(result.document.pages.items())[:2]:
                        print(f"  Page {page_id}: {len(page.children) if page.children else 0} elements")
                        if page.children:
                            element_count = min(2, len(page.children))
                            for j in range(element_count):
                                element = page.children[j]
                                print(f"    {j+1}. {type(element).__name__}")
                                if hasattr(element, 'text') and element.text:
                                    print(f"       Text: {element.text[:50]}...")
                else:
                    print("  Pages object doesn't support iteration")
            except Exception as page_error:
                print(f"  Error accessing pages: {page_error}")
        
        # Export to markdown
        print("\nExporting to markdown...")
        markdown_content = result.document.export_to_markdown()
        
        print(f"Generated markdown length: {len(markdown_content) if markdown_content else 0}")
        if markdown_content:
            print(f"Markdown content:\n{'-'*50}\n{markdown_content}\n{'-'*50}")
        
        return True
            
    except Exception as e:
        print(f"ERROR during conversion: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test_simple_pdf_conversion.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    success = test_simple_pdf_conversion(pdf_path)
    sys.exit(0 if success else 1)
