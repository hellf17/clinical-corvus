"""
OCR functions for extracting text from images and scanned PDFs.
"""

import pytesseract
from PIL import Image
import tempfile
import os
from .image_processing import preprocess_image_for_ocr

# Set the path to the Tesseract executable based on the environment
# In Linux containers, Tesseract is typically installed in /usr/bin/tesseract
# In Windows, it might be in C:\Program Files\Tesseract-OCR\tesseract.exe
import platform
if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
else:
    # Linux/macOS - Tesseract is usually in PATH or /usr/bin
    pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'

def ocr_image(image_path, lang='por+eng+spa', debug=False):
    """
    Perform OCR on an image file.
    
    Args:
        image_path: Path to the image file
        lang: Language codes for OCR (default: Portuguese, English, Spanish)
        debug: If True, save intermediate images for inspection
        
    Returns:
        str: Extracted text from the image
    """
    try:
        print(f"OCR: Processing image: {image_path}")
        # Preprocess image for better OCR results
        processed_image = preprocess_image_for_ocr(image_path, debug=debug)
        
        # Perform OCR
        text = pytesseract.image_to_string(processed_image, lang=lang)
        print(f"OCR: Extracted text: \n---\n{text.strip()}\n---")
        return text.strip()
    except Exception as e:
        print(f"OCR: Error performing OCR on image: {e}")
        return ""

def ocr_pdf_images(pdf_path, lang='por+eng+spa'):
    """
    Perform OCR on images extracted from a PDF.
    
    Args:
        pdf_path: Path to the PDF file
        lang: Language codes for OCR (default: Portuguese, English, Spanish)
        
    Returns:
        str: Extracted text from all images in the PDF
    """
    try:
        from .image_processing import extract_images_from_pdf
    except ImportError:
        print("Image processing module not available.")
        return ""
    
    try:
        # Extract images from PDF
        images = extract_images_from_pdf(pdf_path)
        
        # Perform OCR on each image
        extracted_text = ""
        for i, image in enumerate(images):
            # Save image to temporary file
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
                image.save(tmp_file.name)
                # Perform OCR on the temporary image file
                text = ocr_image(tmp_file.name, lang)
                extracted_text += f"\n--- Image {i+1} ---\n{text}\n"
                # Clean up temporary file
                os.unlink(tmp_file.name)
                
        return extracted_text.strip()
    except Exception as e:
        print(f"Error performing OCR on PDF images: {e}")
        return ""