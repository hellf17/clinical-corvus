
import pytest
import os
import sys
import tempfile
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

# Add the parent directory to the path to import the extractors
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from extractors.ocr_extractor import ocr_image, ocr_pdf_images
from extractors.image_processing import preprocess_image_for_ocr, extract_images_from_pdf

# Mock pytesseract to avoid external dependency and speed up tests
@pytest.fixture(autouse=True)
def mock_pytesseract():
    with patch('pytesseract.image_to_string') as mock_to_string:
        mock_to_string.return_value = "Extracted Text"
        yield mock_to_string

# Mock cv2 functions for image processing
@pytest.fixture(autouse=True)
def mock_cv2():
    with patch('cv2.fastNlMeansDenoising') as mock_denoise, \
         patch('cv2.threshold') as mock_threshold, \
         patch('cv2.minAreaRect') as mock_min_area_rect, \
         patch('cv2.getRotationMatrix2D') as mock_get_rotation_matrix, \
         patch('cv2.warpAffine') as mock_warp_affine, \
         patch('cv2.resize') as mock_resize:
        
        # Default mock returns for image processing
        mock_denoise.return_value = MagicMock()
        mock_threshold.return_value = (None, MagicMock())
        mock_min_area_rect.return_value = ((0,0), (0,0), 0) # No skew by default
        mock_get_rotation_matrix.return_value = MagicMock()
        mock_warp_affine.return_value = MagicMock()
        mock_resize.return_value = MagicMock()
        
        yield

# Mock PyMuPDF (fitz) for PDF image extraction
@pytest.fixture(autouse=True)
def mock_fitz():
    with patch('extractors.image_processing.fitz') as mock_fitz_module:
        mock_doc = MagicMock()
        mock_page = MagicMock()
        mock_image_list_entry = (1, 0, 0, 0, 0, 0, 0, 0) # Example image list entry
        
        mock_doc.extract_image.return_value = {"image": b"dummy_image_bytes"}
        mock_page.get_images.return_value = [mock_image_list_entry]
        mock_doc.__getitem__.return_value = mock_page
        mock_doc.__len__.return_value = 1
        mock_doc.close.return_value = None
        
        mock_fitz_module.open.return_value = mock_doc
        yield mock_fitz_module

class TestOCRExtractor:
    """Test suite for OCR functionality."""

    @pytest.fixture
    def create_test_image(self, tmp_path):
        """Creates a dummy image file with some text."""
        img_path = tmp_path / "test_image.png"
        img = Image.new('RGB', (200, 50), color = (255, 255, 255))
        d = ImageDraw.Draw(img)
        d.text((10,10), "Sample Text", fill=(0,0,0))
        img.save(img_path)
        return str(img_path)

    @pytest.fixture
    def create_test_pdf(self, tmp_path):
        """Creates a dummy PDF file (content doesn't matter for image extraction mock)."""
        pdf_path = tmp_path / "test_pdf.pdf"
        with open(pdf_path, 'wb') as f:
            f.write(b"%PDF-1.4\n1 0 obj<</Type/Page/Contents 2 0 R>>endobj 2 0 obj<</Length 11>>stream\nBT/F1 12 Tf(Hello) TjET\nendstream\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000074 00000 n\ntrailer<</Size 3/Root 1 0 R>>startxref\n120\n%%EOF")
        return str(pdf_path)

    def test_ocr_image(self, create_test_image, mock_pytesseract):
        """Tests ocr_image function."""
        extracted_text = ocr_image(create_test_image)
        assert extracted_text == "Extracted Text"
        mock_pytesseract.assert_called_once()

    def test_ocr_pdf_images(self, create_test_pdf, mock_pytesseract, mock_fitz):
        """Tests ocr_pdf_images function."""
        extracted_text = ocr_pdf_images(create_test_pdf)
        assert "--- Image 1 ---" in extracted_text
        assert "Extracted Text" in extracted_text
        mock_pytesseract.assert_called_once()
        mock_fitz.open.assert_called_once_with(create_test_pdf)

class TestImageProcessing:
    """Test suite for image processing functions."""

    @pytest.fixture
    def create_test_image_for_processing(self, tmp_path):
        """Creates a dummy image file for processing tests."""
        img_path = tmp_path / "process_image.png"
        img = Image.new('L', (100, 100), color = 128) # Grayscale image
        img.save(img_path)
        return str(img_path)

    def test_preprocess_image_for_ocr(self, create_test_image_for_processing, mock_cv2):
        """Tests preprocess_image_for_ocr function."""
        processed_image = preprocess_image_for_ocr(create_test_image_for_processing)
        assert isinstance(processed_image, Image.Image)
        mock_cv2.fastNlMeansDenoising.assert_called_once()
        mock_cv2.threshold.assert_called_once()

    def test_extract_images_from_pdf(self, create_test_pdf, mock_fitz):
        """Tests extract_images_from_pdf function."""
        images = extract_images_from_pdf(create_test_pdf)
        assert len(images) == 1
        assert isinstance(images[0], Image.Image)
        mock_fitz.open.assert_called_once_with(create_test_pdf)

