"""
Fuzzy matching and normalization functions for lab test extraction.
"""

from rapidfuzz import fuzz, process
import re
from .lab_test_synonyms import LAB_TEST_SYNONYMS, SYNONYM_TO_STANDARD, UNIT_CONVERSIONS, MOLAR_MASSES

def fuzzy_match_test_name(extracted_name, threshold=80):
    """
    Use fuzzy matching to find the best match for a test name.
    
    Args:
        extracted_name: The name extracted from the document
        threshold: Minimum similarity score to consider a match
        
    Returns:
        tuple: (standard_name, similarity_score) or (None, 0) if no good match
    """
    # First try exact match in synonyms
    extracted_lower = extracted_name.lower()
    if extracted_lower in SYNONYM_TO_STANDARD:
        return SYNONYM_TO_STANDARD[extracted_lower], 100
    
    # If no exact match, use fuzzy matching
    all_synonyms = []
    for synonyms in LAB_TEST_SYNONYMS.values():
        all_synonyms.extend(synonyms)
    
    # Find the best match
    best_match = process.extractOne(extracted_name, all_synonyms, scorer=fuzz.token_sort_ratio)
    
    if best_match and best_match[1] >= threshold:
        matched_synonym = best_match[0].lower()
        if matched_synonym in SYNONYM_TO_STANDARD:
            return SYNONYM_TO_STANDARD[matched_synonym], best_match[1]
    
    return None, 0

def normalize_number(value_str):
    """
    Normalize number string to handle commas vs. points.
    
    Args:
        value_str: String representation of a number
        
    Returns:
        str: Normalized number string with period as decimal separator
    """
    if not value_str:
        return value_str
    
    # Replace comma with period for decimal separator
    # But be careful not to replace commas used as thousand separators
    # Heuristic: if there's only one comma and it's not at the beginning or end
    # and there are 1-3 digits after it, treat it as a decimal separator
    if ',' in value_str and '.' not in value_str:
        parts = value_str.split(',')
        if len(parts) == 2 and 1 <= len(parts[1]) <= 3:
            return value_str.replace(',', '.')
    
    # If both comma and period are present, assume period is decimal separator
    # and comma is thousand separator
    if ',' in value_str and '.' in value_str:
        # Remove commas (thousand separators) and keep periods (decimal separators)
        return value_str.replace(',', '')
    
    # If only periods are present, assume they are decimal separators
    return value_str

def normalize_unit(unit_str, test_name=None):
    """
    Normalize unit string to a standard form.
    
    Args:
        unit_str: String representation of a unit
        test_name: Name of the test (for context-specific conversions)
        
    Returns:
        str: Normalized unit string
    """
    if not unit_str:
        return unit_str
    
    # Common unit normalizations
    unit_lower = unit_str.lower().strip()
    
    # Normalize common unit representations
    unit_mappings = {
        '/mm³': '/mm3',
        '/µl': '/mm3',
        '/μl': '/mm3',
        'x10^9/l': '/mm3',
        'x10^3/ul': '/mm3',
        'g/dl': 'g/dL',
        'mg/dl': 'mg/dL',
        'g/l': 'g/L',
        'mmol/l': 'mmol/L',
        'meq/l': 'mEq/L',
        'iu/l': 'IU/L',
        'ui/l': 'IU/L',
        'pg/ml': 'pg/mL',
        'ng/ml': 'ng/mL',
        'ug/ml': 'ng/mL',
        'µg/ml': 'ng/mL',
        'μg/ml': 'ng/mL',
    }
    
    # Apply mapping if found
    if unit_lower in unit_mappings:
        return unit_mappings[unit_lower]
    
    return unit_str

def convert_units(value, from_unit, to_unit, test_name=None):
    """
    Convert a value from one unit to another.
    
    Args:
        value: The numeric value to convert
        from_unit: The unit to convert from
        to_unit: The unit to convert to
        test_name: Name of the test (for molar mass lookup)
        
    Returns:
        float: The converted value or None if conversion is not possible
    """
    try:
        # Normalize units
        from_unit_norm = normalize_unit(from_unit)
        to_unit_norm = normalize_unit(to_unit)
        
        # If units are the same, no conversion needed
        if from_unit_norm == to_unit_norm:
            return float(value)
        
        # Check if we have a conversion function
        if from_unit_norm in UNIT_CONVERSIONS and to_unit_norm in UNIT_CONVERSIONS[from_unit_norm]:
            conversion_func = UNIT_CONVERSIONS[from_unit_norm][to_unit_norm]
            
            # Some conversions require molar mass
            if 'mmol/l' in [from_unit_norm, to_unit_norm] and test_name:
                test_key = test_name.lower().replace(' ', '_')
                if test_key in MOLAR_MASSES:
                    return conversion_func(float(value), MOLAR_MASSES[test_key])
            
            # Simple conversion
            return conversion_func(float(value))
        
        # No direct conversion available
        return None
    except (ValueError, KeyError):
        # Conversion failed
        return None

def extract_with_fuzzy_matching(text):
    """
    Extract lab test results using fuzzy matching for test names.
    
    Args:
        text: Text to extract from
        
    Returns:
        dict: Dictionary with extracted data using standard test names
    """
    # This function would be integrated with the existing extraction pipeline
    # For now, it's a placeholder that shows how fuzzy matching could be used
    extracted_data = {}
    
    # Example pattern for extracting test name and value
    # This is a simplified example - in practice, you'd want more sophisticated patterns
    pattern = r'([a-zA-Z\s]+):\s*([\d,.]+)\s*([a-zA-Z/³\d]*)?'
    matches = re.findall(pattern, text)
    
    for match in matches:
        test_name, value, unit = match
        
        # Normalize the value
        normalized_value = normalize_number(value)
        
        # Normalize the unit
        normalized_unit = normalize_unit(unit)
        
        # Try to match the test name using fuzzy matching
        standard_name, score = fuzzy_match_test_name(test_name.strip())
        
        if standard_name:
            # Use the standard name for the key
            key = standard_name
            # Store both value and unit
            extracted_data[key] = {
                'value': normalized_value,
                'unit': normalized_unit,
                'match_score': score
            }
        else:
            # If no match found, use the original name
            key = test_name.strip().lower().replace(' ', '_')
            extracted_data[key] = {
                'value': normalized_value,
                'unit': normalized_unit,
                'match_score': 0
            }
    
    return extracted_data