"""
Image processing functions for OCR preprocessing.
"""

import cv2
import numpy as np
from PIL import Image, ImageOps
import tempfile
import os
import io

def preprocess_image_for_ocr(image_path, debug=False):
    """
    Preprocess an image to improve OCR accuracy.
    
    Args:
        image_path: Path to the image file
        debug: If True, save intermediate images for inspection
        
    Returns:
        PIL.Image: Preprocessed image ready for OCR
    """
    # Open image with PIL
    image = Image.open(image_path)
    
    # Convert to grayscale if not already
    if image.mode != 'L':
        image = image.convert('L')
    
    # Convert PIL image to OpenCV format
    open_cv_image = np.array(image)
    
    # Apply preprocessing techniques to improve OCR
    # Apply preprocessing techniques to improve OCR
    # 1. Denoise (commented out for simpler test image, uncomment for real scans)
    # denoised = cv2.fastNlMeansDenoising(open_cv_image)
    denoised = open_cv_image # Use original if not denoising
    
    # 2. Thresholding (convert to binary image)
    _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # 3. Deskew if needed (commented out for simpler test image, uncomment for real scans)
    # deskewed = deskew_image(binary)
    deskewed = binary # Use original if not deskewing
    
    # 4. Resize if image is too small (OCR works better on larger images)
    resized = resize_image(deskewed)
    
    # Convert back to PIL Image
    processed_image = Image.fromarray(resized)

    if debug:
        processed_image.save("preprocessed_image.png")
    
    return processed_image

def deskew_image(image):
    """
    Correct skew in an image.
    
    Args:
        image: OpenCV image (numpy array)
        
    Returns:
        numpy array: Deskewed image
    """
    coords = np.column_stack(np.where(image > 0))
    angle = cv2.minAreaRect(coords)[-1]
    
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    
    # Only correct if skew is significant
    if abs(angle) > 0.5:
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return rotated
    
    return image

def resize_image(image, min_height=300):
    """
    Resize image if it's too small for good OCR.
    
    Args:
        image: OpenCV image (numpy array)
        min_height: Minimum height for OCR
        
    Returns:
        numpy array: Resized image
    """
    height, width = image.shape[:2]
    
    if height < min_height:
        ratio = min_height / height
        new_width = int(width * ratio)
        resized = cv2.resize(image, (new_width, min_height), interpolation=cv2.INTER_CUBIC)
        return resized
    
    return image

def extract_images_from_pdf(pdf_path):
    """
    Extract images from a PDF file.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        list: List of PIL Images extracted from the PDF
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("PyMuPDF (fitz) not available. Install with 'pip install PyMuPDF' for PDF image extraction.")
        return []
    
    images = []
    
    try:
        pdf_document = fitz.open(pdf_path)
        
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            image_list = page.get_images()
            
            for image_index, img in enumerate(image_list):
                xref = img[0]
                base_image = pdf_document.extract_image(xref)
                image_bytes = base_image["image"]
                
                # Convert bytes to PIL Image
                image = Image.open(io.BytesIO(image_bytes))
                images.append(image)
                
        pdf_document.close()
    except Exception as e:
        print(f"Error extracting images from PDF: {e}")
        
    return images