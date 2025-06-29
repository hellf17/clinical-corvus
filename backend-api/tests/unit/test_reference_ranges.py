"""
Tests for the reference ranges utilities.
"""

import unittest
from utils.reference_ranges import REFERENCE_RANGES, is_abnormal, get_reference_range_text

class TestReferenceRanges(unittest.TestCase):
    """Test cases for the reference ranges module."""
    
    def test_reference_ranges_exist(self):
        """Test that reference ranges dictionary exists and has content."""
        self.assertIsNotNone(REFERENCE_RANGES)
        self.assertGreater(len(REFERENCE_RANGES), 0)
    
    def test_reference_ranges_format(self):
        """Test that reference ranges are in the correct format (tuple of 2 numbers)."""
        for key, value in REFERENCE_RANGES.items():
            self.assertIsInstance(value, tuple)
            self.assertEqual(len(value), 2)
            self.assertIsInstance(value[0], (int, float))
            self.assertIsInstance(value[1], (int, float))
            self.assertLessEqual(value[0], value[1])
    
    def test_is_abnormal(self):
        """Test the is_abnormal function."""
        # Test with normal values
        self.assertFalse(is_abnormal('pH', 7.4))
        self.assertFalse(is_abnormal('Na+', 140))
        
        # Test with abnormal low values
        self.assertTrue(is_abnormal('pH', 7.3))
        self.assertTrue(is_abnormal('K+', 3.0))
        
        # Test with abnormal high values
        self.assertTrue(is_abnormal('pH', 7.5))
        self.assertTrue(is_abnormal('Glicose', 120))
        
        # Test with non-existent parameter
        self.assertFalse(is_abnormal('NonExistentParam', 100))
        
        # Test with None value
        self.assertFalse(is_abnormal('pH', None))
    
    def test_get_reference_range_text(self):
        """Test the get_reference_range_text function."""
        # Test with existing parameter
        self.assertEqual(get_reference_range_text('pH'), "7.35 - 7.45")
        self.assertEqual(get_reference_range_text('Na+'), "135 - 145")
        
        # Test with non-existent parameter
        self.assertEqual(get_reference_range_text('NonExistentParam'), "")

if __name__ == '__main__':
    unittest.main() 