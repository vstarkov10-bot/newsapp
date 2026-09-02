// Lightweight English-language check for RSS items. Some publisher feeds
// occasionally mix in syndicated non-English content (e.g. a Spanish-language
// explainer inside an otherwise-English World News feed), and this app only
// wants English headlines. No external dependency: a fast heuristic beats
// pulling in a language-detection library for this one filter.

// '¿' and '¡' are Spanish/Portuguese-only punctuation with no legitimate use
// in English text, so their presence is treated as a definitive signal.
const NON_ENGLISH_PUNCTUATION = /[¿¡]/;

const SPANISH_STOPWORDS = new Set([
  "el", "la", "los", "las", "de", "del", "que", "qué", "en", "y", "a",
  "es", "un", "una", "unos", "unas", "se", "su", "sus", "por", "para",
  "con", "más", "como", "cómo", "entre", "sobre", "sin", "pero", "ya",
  "este", "esta", "estos", "estas", "también", "según", "hasta",
]);

const ENGLISH_STOPWORDS = new Set([
  "the", "of", "in", "to", "a", "and", "is", "for", "on", "with",
  "that", "this", "as", "by", "at", "from", "it", "an", "be", "are",
  "was", "were", "will", "has", "have", "after", "over", "into",
]);

function isLikelyEnglish(text) {
  if (!text) return true;
  if (NON_ENGLISH_PUNCTUATION.test(text)) return false;

  const words = text.toLowerCase().match(/[a-záéíóúñü]+/g) || [];
  let spanishHits = 0;
  let englishHits = 0;
  for (const w of words) {
    if (SPANISH_STOPWORDS.has(w)) spanishHits++;
    else if (ENGLISH_STOPWORDS.has(w)) englishHits++;
  }

  // Require a couple of Spanish stopword hits (not just one, to avoid
  // false positives on stray words) and a clear majority over English ones.
  return !(spanishHits >= 2 && spanishHits > englishHits);
}

module.exports = { isLikelyEnglish };
