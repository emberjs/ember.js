import { tokenize } from 'simple-html-tokenizer';

/** Strip GXT rendering artifacts from HTML string */
function stripGxtArtifacts(html: string): string {
  if (!(globalThis as any).__GXT_MODE__) return html;
  return html
    // Remove GXT placeholder comments
    .replace(/<!--(?:placeholder|if-entry|each-entry|list-target|list item|list bottom marker|htmlRaw|\/htmlRaw|curried-start|curried-end)[^>]*-->/g, '')
    // Remove data-node-id attributes
    .replace(/\s*data-node-id="[^"]*"/g, '')
    // Unwrap <ember-outlet> wrappers
    .replace(/<\/?ember-outlet[^>]*>/g, '')
    // Collapse multiple spaces/newlines caused by removals
    .replace(/>\s+</g, '><')
    .trim();
}

function generateTokens(containerOrHTML: string | Element) {
  if (typeof containerOrHTML === 'string') {
    return {
      tokens: tokenize(containerOrHTML),
      html: containerOrHTML,
    };
  } else {
    let html = containerOrHTML.innerHTML;
    html = stripGxtArtifacts(html);
    return {
      tokens: tokenize(html),
      html,
    };
  }
}

function normalizeTokens(tokens: ReturnType<typeof tokenize>) {
  tokens.forEach((token) => {
    if (token.type === 'StartTag') {
      // Remove data-node-id from token attributes
      token.attributes = token.attributes
        .filter((attr: any) => !(globalThis as any).__GXT_MODE__ || attr[0] !== 'data-node-id')
        .sort((a: any, b: any) => {
          if (a[0] > b[0]) {
            return 1;
          }
          if (a[0] < b[0]) {
            return -1;
          }
          return 0;
        });
    }
  });
}

export default function equalTokens(
  actualContainer: string | Element,
  expectedHTML: string,
  message: string | null = null
) {
  let actual = generateTokens(actualContainer);
  let expected = generateTokens(expectedHTML);

  normalizeTokens(actual.tokens);
  normalizeTokens(expected.tokens);

  let { assert } = QUnit.config.current;
  let equiv = QUnit.equiv(actual.tokens, expected.tokens);

  if (equiv && expected.html !== actual.html) {
    assert.deepEqual(actual.tokens, expected.tokens, message);
  } else {
    assert.pushResult({
      result: QUnit.equiv(actual.tokens, expected.tokens),
      actual: actual.html,
      expected: expected.html,
      message,
    });
  }
}
