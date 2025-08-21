#!/usr/bin/env python3
"""
Standalone PDF to Markdown converter using OpenAI Vision API
Converts PDF to markdown with rate limiting and page range support
"""

import os
import time
import base64
import gc
import psutil
import argparse
from io import BytesIO
from pdf2image import convert_from_path
from openai import OpenAI
from dotenv import load_dotenv

def get_memory_usage():
    """Get current memory usage in MB"""
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024

def check_memory_limit(limit_mb=2048):
    """Check if memory usage exceeds limit"""
    current_memory = get_memory_usage()
    if current_memory > limit_mb:
        print(f"⚠️  Memory usage: {current_memory:.1f}MB (limit: {limit_mb}MB)")
        return True
    return False

def convert_pdf_to_markdown(pdf_path, output_path=None, delay_seconds=10, start_page=None, end_page=None):
    """Convert PDF to markdown using OpenAI Vision API with rate limiting"""
    
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found: {pdf_path}")
        return False
    
    # Load environment variables
    load_dotenv()
    openai_api_key = os.environ.get('OPENAI_API_KEY')
    if not openai_api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        return False
    
    print(f"Converting PDF: {pdf_path}")
    if start_page or end_page:
        print(f"Page range: {start_page or 1} to {end_page or 'end'}")
    print(f"Rate limiting: {delay_seconds} seconds between pages")
    print(f"Initial memory usage: {get_memory_usage():.1f}MB")
    
    try:
        # Get total page count first
        print("Getting PDF page count...")
        temp_images = convert_from_path(pdf_path, dpi=150, first_page=1, last_page=1)
        if not temp_images:
            print("Error: Cannot read PDF file")
            return False
        del temp_images
        gc.collect()
        
        # Get actual page count using a more memory-efficient method
        from PyPDF2 import PdfReader
        try:
            reader = PdfReader(pdf_path)
            total_pages = len(reader.pages)
            del reader
            gc.collect()
        except:
            # Fallback: process in small batches to estimate
            total_pages = 999  # Will process until error
        
        print(f"Processing PDF with estimated {total_pages} pages")
        
        # Initialize OpenAI client
        client = OpenAI(api_key=openai_api_key)
        
        # Determine output file path early
        if not output_path:
            base_name = os.path.splitext(os.path.basename(pdf_path))[0]
            output_path = f"{base_name}.md"
        
        # Create/clear the output file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("")  # Start with empty file
        
        pages_processed = 0
        
        # Determine page range to process
        start = start_page or 1
        end = min(end_page or total_pages, total_pages)
        
        if start > total_pages:
            print(f"Error: Start page {start} exceeds total pages {total_pages}")
            return False
        
        print(f"Processing pages {start} to {end} (of {total_pages} total)")
        
        # Process pages one by one to minimize memory usage
        page_num = start
        while page_num <= end:
            try:
                # Check memory before processing each page
                if check_memory_limit(1500):  # 1.5GB limit
                    print("🔄 Running garbage collection...")
                    gc.collect()
                    if check_memory_limit(1500):
                        print("❌ Memory usage too high, stopping conversion")
                        break
                
                print(f"Converting page {page_num}... (Memory: {get_memory_usage():.1f}MB)")
                
                # Convert only one page at a time with memory-optimized settings
                images = convert_from_path(
                    pdf_path, 
                    dpi=150,  # Further reduced DPI for memory efficiency
                    first_page=page_num, 
                    last_page=page_num,
                    thread_count=1,  # Single thread to reduce memory
                    poppler_path=None,  # Use system poppler
                    grayscale=False,  # Keep color but optimize other settings
                    size=(None, None),  # No size limit
                    transparent=False,  # Disable transparency to save memory
                    single_file=True  # Single file mode
                )
                
                if not images:
                    print(f"No image generated for page {page_num}")
                    page_num += 1
                    continue
                
                image = images[0]  # Only one image since we're processing one page
                
                print(f"Processing page {page_num}...")
                
                # Convert PIL image to base64
                buffered = BytesIO()
                image.save(buffered, format="PNG", optimize=True)
                img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                
                # Clean up memory immediately
                buffered.close()
                del images, buffered
                gc.collect()
                
                try:
                    response = client.chat.completions.create(
                        model="gpt-4o",
                        messages=[
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "Convert this image to clean markdown text. Extract all text content while preserving structure, formatting, and hierarchy. Use proper markdown syntax for headers, lists, code blocks, and emphasis. If this appears to be an exam question, preserve the question structure and answer choices clearly."
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/png;base64,{img_base64}",
                                            "detail": "high"
                                        }
                                    }
                                ]
                            }
                        ],
                        max_tokens=4000,
                        temperature=0.1
                    )
                    
                    # Clean up base64 string immediately after API call
                    del img_base64
                    gc.collect()
                    
                    page_markdown = response.choices[0].message.content
                    if page_markdown:
                        print(f"  ✓ Extracted {len(page_markdown)} characters from page {page_num}")
                        
                        # Write immediately to file (append mode)
                        with open(output_path, 'a', encoding='utf-8') as f:
                            # Add separator if not first page
                            if pages_processed > 0:
                                f.write('\n\n---\n\n')
                            f.write(f"# Page {page_num}\n\n{page_markdown}")
                        
                        pages_processed += 1
                        print(f"  ✓ Written page {page_num} to {output_path}")
                    else:
                        print(f"  ✗ No content extracted from page {page_num}")
                    
                    # Rate limiting: wait between API calls
                    if page_num < end:
                        print(f"  Waiting {delay_seconds} seconds to avoid rate limiting...")
                        time.sleep(delay_seconds)
                        
                except Exception as e:
                    print(f"  ✗ Error processing page {page_num}: {e}")
                    # Clean up on error
                    if 'img_base64' in locals():
                        del img_base64
                    gc.collect()
                
                page_num += 1
                
            except MemoryError as e:
                print(f"❌ Memory error on page {page_num}: {e}")
                print(f"Current memory usage: {get_memory_usage():.1f}MB")
                print("🔄 Running aggressive garbage collection...")
                gc.collect()
                print(f"Memory after cleanup: {get_memory_usage():.1f}MB")
                if get_memory_usage() > 1000:  # Still high after cleanup
                    print("❌ Unable to continue due to memory constraints")
                    break
                page_num += 1
                continue
            except Exception as e:
                print(f"Error converting page {page_num}: {e}")
                if "cannot identify image file" in str(e).lower() or page_num > end:
                    print(f"Reached end of processing range at page {page_num-1}")
                    break
                page_num += 1
                continue
        
        if pages_processed == 0:
            print("No markdown content extracted from any pages")
            return False
        
        # Get final file size
        final_size = os.path.getsize(output_path)
        
        print(f"✓ Markdown saved to: {output_path}")
        print(f"✓ Total file size: {final_size} bytes")
        print(f"✓ Successfully processed {pages_processed} pages")
        return True
        
    except Exception as e:
        print(f"Error during conversion: {e}")
        import traceback
        traceback.print_exc()
        return False

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Convert PDF to Markdown using OpenAI Vision API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python convert_pdf_standalone.py document.pdf
  python convert_pdf_standalone.py document.pdf --start 5 --end 10
  python convert_pdf_standalone.py document.pdf --page 7
  python convert_pdf_standalone.py document.pdf --output output.md --delay 5
        """
    )
    
    parser.add_argument("pdf_file", help="Path to the PDF file to convert")
    parser.add_argument("--start", type=int, help="Start page number (1-based)")
    parser.add_argument("--end", type=int, help="End page number (1-based)")
    parser.add_argument("--page", type=int, help="Single page to convert (shortcut for --start X --end X)")
    parser.add_argument("--output", "-o", help="Output markdown file path")
    parser.add_argument("--delay", type=int, default=10, help="Delay between API calls in seconds (default: 10)")
    
    args = parser.parse_args()
    
    # Handle single page argument
    if args.page:
        if args.start or args.end:
            parser.error("Cannot use --page with --start or --end")
        args.start = args.page
        args.end = args.page
    
    # Validate page range
    if args.start and args.end and args.start > args.end:
        parser.error("Start page must be less than or equal to end page")
    
    return args

if __name__ == "__main__":
    args = parse_arguments()
    
    success = convert_pdf_to_markdown(
        pdf_path=args.pdf_file,
        output_path=args.output,
        delay_seconds=args.delay,
        start_page=args.start,
        end_page=args.end
    )
    
    if success:
        print("✓ PDF conversion completed successfully!")
    else:
        print("✗ PDF conversion failed!")