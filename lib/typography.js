'use strict';

function normalizeNumericRanges(text) {
  return text.replace(/\b(\d{1,4}(?::\d{1,3})?)--(\d{1,4})\b/g, '$1–$2');
}

module.exports = {
  normalizeNumericRanges,
};
