class TranslationOutput {
  translated_text string
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
    6. Return ONLY the translated text, nothing else
    
    TEXT TO TRANSLATE:
    {{ input }}
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
    6. Return ONLY the translated text, nothing else
    
    TEXT TO TRANSLATE:
    {{ input }}
  "#
}