class TranslationOutput {
  translated_text string
}

function TranslateToEnglish(input: string) -> TranslationOutput {
  client DrCorvusLLM
  prompt #"
    Translate the following text to English. Do not add any extra text or explanations, only the translated text.
    {{ input }}
  "#
} 

function TranslateToPortuguese(input: string) -> TranslationOutput {
  client DrCorvusLLM
  prompt #"
    Translate the following text to Portuguese. Do not add any extra text or explanations, only the translated text.
    {{ input }}
  "#
}