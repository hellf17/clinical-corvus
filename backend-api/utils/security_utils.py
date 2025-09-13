"""
Security Utilities

This module provides utility functions for security-related tasks,
such as input sanitization and validation.
"""

import re

def sanitize_input(text: str) -> str:
    """
    Sanitizes user input to prevent common injection attacks.
    This is a basic implementation and should be expanded based on specific needs.

    Args:
        text: The user input string.

    Returns:
        The sanitized string.
    """
    if not isinstance(text, str):
        return ""

    # Remove characters that could be used for prompt injection or other attacks
    # This is a restrictive example; you might need to allow certain characters
    # depending on your use case.
    sanitized_text = re.sub(r'[<>{}\[\];\'"`|\\/]', '', text)

    # Limit the length of the input
    max_length = 2000
    if len(sanitized_text) > max_length:
        sanitized_text = sanitized_text[:max_length]

    return sanitized_text
