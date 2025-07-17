#!/usr/bin/env python3
"""
PDF Screenshot Script
Takes screenshots of each page of a PDF using pyautogui
"""

from PIL import Image
import pyautogui
import time
import os
import subprocess
import sys
import argparse
import glob
from pathlib import Path
import PyPDF2

# Disable pyautogui failsafe (optional - remove if you want failsafe)
pyautogui.FAILSAFE = True

def get_pdf_page_count(pdf_path):
    """Get the total number of pages in the PDF"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            return len(pdf_reader.pages)
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return None

def open_pdf(pdf_path):
    """Open PDF with the default system viewer"""
    try:
        if sys.platform.startswith('win'):
            os.startfile(pdf_path)
        elif sys.platform.startswith('darwin'):  # macOS
            subprocess.run(['open', pdf_path])
        else:  # Linux
            subprocess.run(['xdg-open', pdf_path])
        
        print(f"Opening PDF: {pdf_path}")
        print("Please ensure the PDF opens in full-screen or maximized window")
        print("Waiting 5 seconds for PDF to load...")
        time.sleep(5)
        return True
    except Exception as e:
        print(f"Error opening PDF: {e}")
        return False

def take_page_screenshot(page_num, output_dir, region=None):
    """Take a screenshot of the current page"""
    try:
        if region:
            # Take screenshot of specific region (x, y, width, height)
            screenshot = pyautogui.screenshot(region=region)
        else:
            # Take full screen screenshot
            screenshot = pyautogui.screenshot()
        
        # Save screenshot
        filename = f"page_{page_num:03d}.png"
        filepath = os.path.join(output_dir, filename)
        screenshot.save(filepath)
        print(f"Screenshot saved: {filename}")
        return True
    except Exception as e:
        print(f"Error taking screenshot: {e}")
        return False

def navigate_to_next_page():
    """Navigate to the next page using keyboard shortcut"""
    try:
        # Common navigation methods (you can modify based on your PDF viewer)
        # Method 1: Page Down key
        pyautogui.press('pagedown')
        
        # Method 2: Right arrow key (alternative)
        # pyautogui.press('right')
        
        # Method 3: Down arrow key (alternative)
        # pyautogui.press('down')
        
        # Wait for page to load
        time.sleep(2)
        return True
    except Exception as e:
        print(f"Error navigating: {e}")
        return False

def screenshot_pdf_pages(pdf_path, output_dir=None, screenshot_region=None, delay_between_pages=2, 
                        merge_images_flag=False, merge_layout="vertical", merge_filename="merged_pdf.png", 
                        delete_individual=False):
    """
    Main function to screenshot all pages of a PDF
    
    Args:
        pdf_path (str): Path to the PDF file
        output_dir (str): Directory to save screenshots (default: pdf_screenshots)
        screenshot_region (tuple): Region to screenshot (x, y, width, height) or None for full screen
        delay_between_pages (float): Delay in seconds between page navigation
        merge_images_flag (bool): Whether to merge all images into one file
        merge_layout (str): Layout for merged image ('vertical', 'horizontal', 'grid')
        merge_filename (str): Filename for merged image
        delete_individual (bool): Whether to delete individual images after merging
    """
    
    # Validate PDF path
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found: {pdf_path}")
        return False
    
    # Get PDF page count
    total_pages = get_pdf_page_count(pdf_path)
    if total_pages is None:
        print("Could not determine page count. Proceeding anyway...")
        total_pages = 999  # Large number as fallback
    else:
        print(f"PDF has {total_pages} pages")
    
    # Setup output directory
    if output_dir is None:
        pdf_name = Path(pdf_path).stem
        output_dir = f"{pdf_name}_screenshots"
    
    os.makedirs(output_dir, exist_ok=True)
    print(f"Screenshots will be saved to: {output_dir}")
    
    # Open PDF
    if not open_pdf(pdf_path):
        return False
    
    # Wait for user confirmation
    input("Press Enter when the PDF is ready and visible on screen...")
    
    # Take screenshots
    print("Starting screenshot process...")
    print("Move your mouse to the top-left corner to stop (failsafe)")
    
    successful_screenshots = 0
    
    for page_num in range(1, total_pages + 1):
        print(f"Processing page {page_num}/{total_pages}")
        
        # Take screenshot of current page
        if take_page_screenshot(page_num, output_dir, screenshot_region):
            successful_screenshots += 1
        
        # Navigate to next page (skip on last page)
        if page_num < total_pages:
            navigate_to_next_page()
            time.sleep(delay_between_pages)
        
        # Check if we've reached the end (optional - detect if navigation failed)
        # You can add logic here to detect if we're still on the same page
    
    print(f"\nScreenshot process completed!")
    print(f"Successfully captured {successful_screenshots} screenshots")
    print(f"Screenshots saved in: {output_dir}")
    
    # Merge images if requested
    if merge_images_flag and successful_screenshots > 0:
        print(f"\nMerging images into single file...")
        merge_success = merge_images(
            image_dir=output_dir,
            output_filename=merge_filename,
            layout=merge_layout,
            delete_individual=delete_individual
        )
        
        if merge_success:
            print("Image merging completed successfully!")
        else:
            print("Image merging failed, but individual screenshots are still available.")
    
    return True

def merge_images(image_dir, output_filename="merged_pdf.png", layout="vertical", delete_individual=False):
    """
    Merge all page images into a single image file
    
    Args:
        image_dir (str): Directory containing individual page images
        output_filename (str): Name of the merged output file
        layout (str): Layout type - 'vertical', 'horizontal', or 'grid'
        delete_individual (bool): Whether to delete individual page images after merging
    """
    try:
        # Get all page images sorted by page number
        image_pattern = os.path.join(image_dir, "page_*.png")
        image_files = sorted(glob.glob(image_pattern))
        
        if not image_files:
            print("No page images found to merge")
            return False
        
        print(f"Found {len(image_files)} images to merge")
        
        # Load all images
        images = []
        for img_path in image_files:
            try:
                img = Image.open(img_path)
                images.append(img)
                print(f"Loaded: {os.path.basename(img_path)}")
            except Exception as e:
                print(f"Error loading {img_path}: {e}")
                continue
        
        if not images:
            print("No valid images to merge")
            return False
        
        # Merge based on layout
        if layout == "vertical":
            merged_image = merge_vertical(images)
        elif layout == "horizontal":
            merged_image = merge_horizontal(images)
        elif layout == "grid":
            merged_image = merge_grid(images)
        else:
            print(f"Unknown layout: {layout}. Using vertical.")
            merged_image = merge_vertical(images)
        
        # Save merged image
        output_path = os.path.join(image_dir, output_filename)
        merged_image.save(output_path, "PNG", optimize=True)
        print(f"Merged image saved: {output_path}")
        
        # Get file size info
        file_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
        print(f"Merged image size: {merged_image.size[0]}x{merged_image.size[1]} pixels ({file_size:.1f} MB)")
        
        # Optionally delete individual images
        if delete_individual:
            print("Deleting individual page images...")
            for img_path in image_files:
                try:
                    os.remove(img_path)
                    print(f"Deleted: {os.path.basename(img_path)}")
                except Exception as e:
                    print(f"Error deleting {img_path}: {e}")
        
        return True
        
    except Exception as e:
        print(f"Error merging images: {e}")
        return False

def merge_vertical(images):
    """Merge images vertically (stack on top of each other)"""
    # Calculate total dimensions
    max_width = max(img.size[0] for img in images)
    total_height = sum(img.size[1] for img in images)
    
    # Create new image
    merged = Image.new('RGB', (max_width, total_height), 'white')
    
    # Paste images
    y_offset = 0
    for img in images:
        # Center image horizontally if it's smaller than max_width
        x_offset = (max_width - img.size[0]) // 2
        merged.paste(img, (x_offset, y_offset))
        y_offset += img.size[1]
    
    return merged

def merge_horizontal(images):
    """Merge images horizontally (side by side)"""
    # Calculate total dimensions
    total_width = sum(img.size[0] for img in images)
    max_height = max(img.size[1] for img in images)
    
    # Create new image
    merged = Image.new('RGB', (total_width, max_height), 'white')
    
    # Paste images
    x_offset = 0
    for img in images:
        # Center image vertically if it's smaller than max_height
        y_offset = (max_height - img.size[1]) // 2
        merged.paste(img, (x_offset, y_offset))
        x_offset += img.size[0]
    
    return merged

def merge_grid(images):
    """Merge images in a grid layout"""
    import math
    
    num_images = len(images)
    # Calculate grid dimensions (try to make it roughly square)
    cols = math.ceil(math.sqrt(num_images))
    rows = math.ceil(num_images / cols)
    
    # Get maximum dimensions for consistent sizing
    max_width = max(img.size[0] for img in images)
    max_height = max(img.size[1] for img in images)
    
    # Create new image
    total_width = cols * max_width
    total_height = rows * max_height
    merged = Image.new('RGB', (total_width, total_height), 'white')
    
    # Paste images in grid
    for i, img in enumerate(images):
        row = i // cols
        col = i % cols
        x = col * max_width
        y = row * max_height
        
        # Center image in its grid cell
        x_offset = (max_width - img.size[0]) // 2
        y_offset = (max_height - img.size[1]) // 2
        
        merged.paste(img, (x + x_offset, y + y_offset))
    
    return merged
    """
    Helper function to define a custom screenshot region
    Allows user to select the PDF viewing area
    """
    print("Position your mouse at the TOP-LEFT corner of the PDF content area and press Enter...")
    input()
    x1, y1 = pyautogui.position()
    
    print("Now position your mouse at the BOTTOM-RIGHT corner of the PDF content area and press Enter...")
    input()
    x2, y2 = pyautogui.position()
    
    width = x2 - x1
    height = y2 - y1
    
    print(f"Screenshot region defined: ({x1}, {y1}, {width}, {height})")
    return (x1, y1, width, height)


def define_screenshot_region():
    """Define screenshot region interactively (placeholder implementation)"""
    print("Interactive region selection not implemented yet.")
    print("Using full screen region.")
    return None


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Take page-by-page screenshots of a PDF file and optionally merge them",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage
  python script.py document.pdf
  
  # Custom output directory
  python script.py document.pdf -o screenshots
  
  # Merge all pages into one vertical image
  python script.py document.pdf -o images --merge
  
  # Merge with custom layout and filename
  python script.py document.pdf --merge --layout horizontal --merge-file "full_document.png"
  
  # Merge and delete individual page images
  python script.py document.pdf --merge --delete-individual
  
  # Grid layout with custom delay
  python script.py document.pdf --merge --layout grid --delay 3
        """
    )
    
    parser.add_argument(
        "pdf_path",
        help="Path to the PDF file to screenshot"
    )
    
    parser.add_argument(
        "-o", "--output-dir",
        default=None,
        help="Directory to save screenshots (default: auto-generated based on PDF name)"
    )
    
    parser.add_argument(
        "-d", "--delay",
        type=float,
        default=2.0,
        help="Delay in seconds between page navigation (default: 2.0)"
    )
    
    parser.add_argument(
        "--define-region",
        action="store_true",
        help="Interactively define a custom screenshot region"
    )
    
    parser.add_argument(
        "--region",
        nargs=4,
        type=int,
        metavar=("X", "Y", "WIDTH", "HEIGHT"),
        help="Custom screenshot region as X Y WIDTH HEIGHT"
    )
    
    # Merge options
    parser.add_argument(
        "--merge",
        action="store_true",
        help="Merge all page images into a single file after capturing"
    )
    
    parser.add_argument(
        "--layout",
        choices=["vertical", "horizontal", "grid"],
        default="vertical",
        help="Layout for merged image (default: vertical)"
    )
    
    parser.add_argument(
        "--merge-file",
        default="merged_pdf.png",
        help="Filename for merged image (default: merged_pdf.png)"
    )
    
    parser.add_argument(
        "--delete-individual",
        action="store_true",
        help="Delete individual page images after merging (only works with --merge)"
    )
    
    args = parser.parse_args()
    
    # Validate PDF path
    if not os.path.exists(args.pdf_path):
        print(f"Error: PDF file not found: {args.pdf_path}")
        sys.exit(1)
    
    # Validate delete-individual option
    if args.delete_individual and not args.merge:
        print("Warning: --delete-individual option requires --merge. Ignoring...")
        args.delete_individual = False
    
    # Setup screenshot region
    screenshot_region = None
    if args.define_region:
        screenshot_region = define_screenshot_region()
    elif args.region:
        screenshot_region = tuple(args.region)
        print(f"Using custom region: {screenshot_region}")
    
    print("PDF Screenshot Tool")
    print("==================")
    print(f"PDF Path: {args.pdf_path}")
    print(f"Output Directory: {args.output_dir or 'Auto-generated'}")
    print(f"Delay between pages: {args.delay} seconds")
    print(f"Screenshot region: {'Full screen' if screenshot_region is None else screenshot_region}")
    if args.merge:
        print(f"Merge images: Yes ({args.layout} layout)")
        print(f"Merged filename: {args.merge_file}")
        print(f"Delete individual images: {'Yes' if args.delete_individual else 'No'}")
    else:
        print("Merge images: No")
    print()
    
    # Run the screenshot process
    success = screenshot_pdf_pages(
        pdf_path=args.pdf_path,
        output_dir=args.output_dir,
        screenshot_region=screenshot_region,
        delay_between_pages=args.delay,
        merge_images_flag=args.merge,
        merge_layout=args.layout,
        merge_filename=args.merge_file,
        delete_individual=args.delete_individual
    )
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()