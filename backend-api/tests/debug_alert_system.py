"""
Debug script for the alert system functionality.
"""

import sys
import os
from pprint import pprint

# Add the root directory to the Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import the AlertSystem
from utils.alert_system import AlertSystem

def main():
    """Main debug function."""
    print("Debugging AlertSystem._organize_exams_by_type")
    
    # Test data from the failing test
    exams = [
        {"test": "Some Test", "value": 100, "unit": "mg/dL", "type": "renal"},
        {"test": "Another Test", "value": 200, "unit": "mg/dL", "type": "hepatic"},
        {"test": "Blood Test", "value": 10, "unit": "g/dL", "type": "hematology"},
        {"test": "Gas Test", "value": 7.4, "unit": "", "type": "blood gas"},
        {"test": "Salt Test", "value": 145, "unit": "mEq/L", "type": "electrolytes"},
        {"test": "Heart Test", "value": 0.02, "unit": "ng/mL", "type": "cardiac"},
        {"test": "Culture Test", "value": "Positive", "unit": "", "type": "microbiology"},
        {"test": "Sugar Test", "value": 120, "unit": "mg/dL", "type": "metabolism"},
        {"test": "Misc Test", "value": 999, "unit": "unknown", "type": "other"}
    ]
    
    # Print the original exams
    print("\nOriginal Exams:")
    for i, exam in enumerate(exams):
        print(f"{i}. {exam['test']} (type: {exam.get('type', 'N/A')})")
    
    # Process exams
    result = AlertSystem._organize_exams_by_type(exams)
    
    # Print categorization results
    print("\nCategorization Results:")
    for category, items in result.items():
        print(f"\n{category.upper()} ({len(items)} items):")
        for item in items:
            print(f"  - {item['test']} (type: {item.get('type', 'N/A')})")
    
    # Check specific problematic categorization
    if 'hepatic' in result:
        print("\nTests in HEPATIC category:")
        for item in result['hepatic']:
            print(f"  - {item['test']} (type: {item.get('type', 'N/A')})")

if __name__ == "__main__":
    main() 