const heDecodeMap = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

const decodeOnce = (value = '') =>
  String(value)
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity) => {
      if (heDecodeMap[entity]) return heDecodeMap[entity];
      if (entity.startsWith('&#x')) {
        return String.fromCharCode(parseInt(entity.slice(3, -1), 16));
      }
      if (entity.startsWith('&#')) {
        return String.fromCharCode(parseInt(entity.slice(2, -1), 10));
      }
      return entity;
    });

/** Decode escaped HTML repeatedly until stable (handles double-encoding). */
const decodeHtmlEntities = (html = '') => {
  let prev = '';
  let current = String(html || '');
  let guard = 0;
  while (current !== prev && guard < 5) {
    prev = current;
    current = decodeOnce(current);
    guard += 1;
  }
  return current;
};

/** Normalize Jodit output: unwrap accidental nested <p><p>...</p></p>. */
const normalizeRichHtml = (html = '') => {
  let value = decodeHtmlEntities(html).trim();
  if (!value) return '';

  // If the whole payload is still escaped tags as text, decode again
  if (/&lt;\/?[a-z]/i.test(value)) {
    value = decodeHtmlEntities(value);
  }

  // Collapse nested paragraph wrappers common with editors
  value = value.replace(/<p>\s*<p>/gi, '<p>').replace(/<\/p>\s*<\/p>/gi, '</p>');

  return value;
};

module.exports = {
  decodeHtmlEntities,
  normalizeRichHtml,
};
