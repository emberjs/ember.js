/**
 * ESM port of tests/node/helpers/assert-html-matches.js
 *
 * Tests whether two fragments of HTML 'appear' to match.
 * Ignores whitespace and ID attributes (which Ember auto-generates).
 */
import { HtmlDiffer } from 'html-differ';

const htmlDiffer = new HtmlDiffer({
  ignoreAttributes: ['id'],
  ignoreWhitespaces: true,
});

export function assertHtmlMatches(actual, expected) {
  return htmlDiffer.isEqual(actual, expected);
}
