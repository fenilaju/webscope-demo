// Small, dependency-free retrieval demo: score text chunks by query word overlap.
export function retrieveChunks(document, question, limit = 4) {
  const chunks = document.match(/[^.!?\n]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  const words = question.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  return chunks
    .map((text) => ({ text, score: words.reduce((n, word) => n + (text.toLowerCase().includes(word) ? 1 : 0), 0) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.text);
}
