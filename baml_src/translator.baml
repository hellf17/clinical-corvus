class TranslationOutput {
  translated_text string
}

class BatchTranslationOutput {
  translated_texts string[]
}

function TranslateToEnglish(input: string) -> TranslationOutput {
  client Translator
  prompt #"
    You are a professional translator with expertise in medical and scientific translation.
    
    Translate the following text from Portuguese to English.
    
    Important translation rules:
    1. Maintain the exact same formatting, paragraph breaks, and bullet points as the original text
    2. Preserve all technical medical terminology with precise English equivalents
    3. Keep the same tone (formal/academic/conversational) as the original text
    4. Do not add any explanations, notes, or extra text
    5. Do not summarize or modify the content - translate everything exactly
    
    TEXT TO TRANSLATE:
    {{ input }}
    
    {{ ctx.output_format }}
  "#
}

function TranslateToPortuguese(input: string) -> TranslationOutput {
  client Translator
  prompt #"
    You are a professional translator with expertise in medical and scientific translation.
    
    Translate the following text from English to Portuguese (Brazilian variant).
    
    Important translation rules:
    1. Maintain the exact same formatting, paragraph breaks, and bullet points as the original text
    2. Preserve all technical medical terminology with precise Portuguese equivalents
    3. Keep the same tone (formal/academic/conversational) as the original text
    4. Do not add any explanations, notes, or extra text
    5. Do not summarize or modify the content - translate everything exactly
    
    TEXT TO TRANSLATE:
    {{ input }}
    
    {{ ctx.output_format }}
  "#
}

function BatchTranslateToEnglish(inputs: string[]) -> BatchTranslationOutput {
  client Translator
  prompt #"
    You are a professional translator with expertise in medical and scientific translation.
    
    Translate the following texts from Portuguese to English. Each text should be translated separately.
    
    Important translation rules:
    1. Maintain the exact same formatting, paragraph breaks, and bullet points as the original text
    2. Preserve all technical medical terminology with precise English equivalents
    3. Keep the same tone (formal/academic/conversational) as the original text
    4. Do not add any explanations, notes, or extra text
    5. Do not summarize or modify the content - translate everything exactly
    6. Translate each text separately and return them in the same order
    7. If a text cannot be translated, return an empty string for that position
    
    TEXTS TO TRANSLATE:
    {% for input in inputs %}
    {{ loop.index }}. {{ input }}
    {% endfor %}
    
    {{ ctx.output_format }}
  "#
}

function BatchTranslateToPortuguese(inputs: string[]) -> BatchTranslationOutput {
  client Translator
  prompt #"
    You are a professional translator with expertise in medical and scientific translation.
    
    Translate the following texts from English to Portuguese (Brazilian variant). Each text should be translated separately.
    
    Important translation rules:
    1. Maintain the exact same formatting, paragraph breaks, and bullet points as the original text
    2. Preserve all technical medical terminology with precise Portuguese equivalents
    3. Keep the same tone (formal/academic/conversational) as the original text
    4. Do not add any explanations, notes, or extra text
    5. Do not summarize or modify the content - translate everything exactly
    6. Translate each text separately and return them in the same order
    7. If a text cannot be translated, return an empty string for that position
    
    TEXTS TO TRANSLATE:
    {% for input in inputs %}
    {{ loop.index }}. {{ input }}
    {% endfor %}
    
    {{ ctx.output_format }}
  "#
}

function FallbackTranslateToEnglish(input: string) -> TranslationOutput {
  client Translator
  prompt #"
    You are a professional translator serving as a fallback when the primary DeepL service is unavailable.
    
    Translate the following text from Portuguese to English with high accuracy.
    
    Important translation rules:
    1. Maintain the exact same formatting, paragraph breaks, and bullet points as the original text
    2. Preserve all technical medical terminology with precise English equivalents
    3. Keep the same tone (formal/academic/conversational) as the original text
    4. Do not add any explanations, notes, or extra text
    5. Do not summarize or modify the content - translate everything exactly
    6. This is a fallback translation - ensure maximum accuracy
    
    TEXT TO TRANSLATE:
    {{ input }}
    
    {{ ctx.output_format }}
  "#
}

function FallbackTranslateToPortuguese(input: string) -> TranslationOutput {
  client Translator
  prompt #"
    You are a professional translator serving as a fallback when the primary DeepL service is unavailable.
    
    Translate the following text from English to Portuguese (Brazilian variant) with high accuracy.
    
    Important translation rules:
    1. Maintain the exact same formatting, paragraph breaks, and bullet points as the original text
    2. Preserve all technical medical terminology with precise Portuguese equivalents
    3. Keep the same tone (formal/academic/conversational) as the original text
    4. Do not add any explanations, notes, or extra text
    5. Do not summarize or modify the content - translate everything exactly
    6. This is a fallback translation - ensure maximum accuracy
    
    TEXT TO TRANSLATE:
    {{ input }}
    
    {{ ctx.output_format }}
  "#
}