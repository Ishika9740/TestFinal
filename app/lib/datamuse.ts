// lib/datamuse.ts

export async function getSynonyms(word: string): Promise<string[]> {
  try {
    const response = await fetch(`https://api.datamuse.com/words?rel_syn=${word}`);
    if (!response.ok) throw new Error('Synonyms not found');
    const data = await response.json();
    return data.map((entry: { word: string }) => entry.word);
  } catch (error) {
    console.error(`Error fetching synonyms for "${word}":`, error);
    return [];
  }
}


