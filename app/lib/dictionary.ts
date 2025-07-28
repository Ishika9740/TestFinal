
// lib/dictionary.ts

export async function fetchDefinition(word: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) throw new Error('Definition not found');
    const data = await response.json();
    return data[0]?.meanings[0]?.definitions[0]?.definition || null;
  } catch (error) {
    console.error(`Error fetching definition for "${word}":`, error);
    return null;
  }
}
