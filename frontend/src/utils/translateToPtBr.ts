// Simple translation stub for PT-br. Replace with real API integration as needed.
export async function translateToPtBr(text: string): Promise<string> {
  // TODO: Integrate with Google Translate, DeepL, etc.
  // For now, just return the original text (simulate translation).
  return text;
}

// Recursively translate all string fields in an object/array
type AnyObject = Record<string, any>;

export async function translateObjectToPtBr(obj: any): Promise<any> {
  if (typeof obj === 'string') {
    return translateToPtBr(obj);
  } else if (Array.isArray(obj)) {
    return Promise.all(obj.map(translateObjectToPtBr));
  } else if (obj && typeof obj === 'object') {
    const entries = await Promise.all(
      Object.entries(obj).map(async ([k, v]) => [k, await translateObjectToPtBr(v)])
    );
    return Object.fromEntries(entries);
  }
  return obj;
}
