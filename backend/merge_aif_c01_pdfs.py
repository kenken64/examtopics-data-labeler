#!/usr/bin/env python3
"""
Merge AIF-C01 PDF files in correct order
"""

import os
from PyPDF2 import PdfWriter, PdfReader

def merge_aif_c01_pdfs():
    # Define the PDF files in the correct order
    pdf_files = [
        "AIF-C01-Q1-50-no-answers.pdf",
        "AIF-C01-Q51-100-no-answers.pdf", 
        "AIF-C01-Q101-150-no-answers.pdf",
        "AIF-C01-Q151-168-no-answers.pdf"
    ]
    
    # Output filename
    output_filename = "AIF-C01-Complete-Q1-168-no-answers.pdf"
    
    # Create a PdfWriter object
    pdf_writer = PdfWriter()
    
    print("Merging AIF-C01 PDF files...")
    
    # Process each PDF file
    for pdf_file in pdf_files:
        if os.path.exists(pdf_file):
            print(f"Adding: {pdf_file}")
            pdf_reader = PdfReader(pdf_file)
            
            # Add all pages from the current PDF
            for page_num in range(len(pdf_reader.pages)):
                pdf_writer.add_page(pdf_reader.pages[page_num])
        else:
            print(f"Warning: {pdf_file} not found, skipping...")
    
    # Write the merged PDF
    with open(output_filename, 'wb') as output_file:
        pdf_writer.write(output_file)
    
    print(f"✓ Successfully merged {len(pdf_files)} PDF files into: {output_filename}")
    print(f"Total pages: {len(pdf_writer.pages)}")

if __name__ == "__main__":
    merge_aif_c01_pdfs()