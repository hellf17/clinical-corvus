"""
Laboratory result data model for storing and managing lab test results.
"""

from datetime import datetime
from src.utils.reference_ranges import REFERENCE_RANGES, is_abnormal

class LabResult:
    """
    Class representing a laboratory test result, with metadata and analysis functionality.
    """
    
    def __init__(self, test_name, value, unit=None, timestamp=None, reference_range=None):
        """
        Initialize a new lab test result.
        
        Args:
            test_name: Name/code of the test (e.g., 'Na+', 'pH', 'Hb')
            value: The test result value (float or string for qualitative results)
            unit: The unit of measurement (e.g., 'mmol/L', 'mg/dL')
            timestamp: When the test was performed/resulted (datetime object)
            reference_range: Custom reference range as tuple (low, high) if different from standard
        """
        self.test_name = test_name
        self.value = value
        self.unit = unit
        self.timestamp = timestamp or datetime.now()
        self.reference_range = reference_range
        
    @property
    def is_numeric(self):
        """Check if the result value is numeric."""
        return isinstance(self.value, (int, float))
    
    @property
    def is_abnormal(self):
        """
        Check if the result is outside the reference range.
        
        Returns:
            bool: True if abnormal, False if normal or if reference range is not available
        """
        if not self.is_numeric:
            return False
            
        # Use custom reference range if provided, otherwise use global reference values
        if self.reference_range:
            low, high = self.reference_range
            return self.value < low or self.value > high
        else:
            return is_abnormal(self.test_name, self.value)
            
    def get_reference_range(self):
        """
        Get the applicable reference range for this test.
        
        Returns:
            tuple or None: (low, high) reference range or None if not available
        """
        if self.reference_range:
            return self.reference_range
        elif self.test_name in REFERENCE_RANGES:
            return REFERENCE_RANGES[self.test_name]
        return None
        
    def get_formatted_value(self):
        """
        Get the formatted value with units if available.
        
        Returns:
            str: Formatted value
        """
        if not self.is_numeric:
            return str(self.value)
            
        if self.unit:
            return f"{self.value} {self.unit}"
        else:
            return str(self.value)
            
    def get_status_text(self):
        """
        Get text describing the status of this result (normal, high, low).
        
        Returns:
            str: Status description
        """
        if not self.is_numeric:
            return "QUALITATIVO"
            
        ref_range = self.get_reference_range()
        if not ref_range:
            return "REF. DESCONHECIDA"
            
        low, high = ref_range
        if self.value < low:
            return "BAIXO"
        elif self.value > high:
            return "ALTO"
        else:
            return "NORMAL"
            
    def __str__(self):
        """String representation of the lab result."""
        status = self.get_status_text()
        ref_range = self.get_reference_range()
        
        result = f"{self.test_name}: {self.get_formatted_value()}"
        
        if ref_range:
            result += f" [Ref: {ref_range[0]}-{ref_range[1]}]"
            
        result += f" - {status}"
        
        return result 