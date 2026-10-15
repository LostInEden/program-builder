// Display branding for generated text; saved coaching content is not rewritten.
export const productLanguage = (text: string) => text.replace(/\bAI\b/g, 'CounterScheme');
