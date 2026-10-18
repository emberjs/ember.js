import { tokenize } from 'simple-html-tokenizer';

/**
 * Whether a comment with this text is one GXT renders for its own bookkeeping:
 * the `/htmlRaw` end anchor of `{{{trusted}}}` output, the `curried-start` /
 * `curried-end` boundaries of a curried component, or a placeholder. GXT-mode
 * assertions ignore these, like the empty `<!---->` marker both renderers use.
 */
export function isGxtMarkerComment(text: string): boolean {
  return (
    text.includes('placeholder') ||
    text.includes('curried-start') ||
    text.includes('curried-end') ||
    text === '/htmlRaw'
  );
}

/**
 * GXT mode: `html` without GXT's rendering artifacts: its marker comments (see
 * `isGxtMarkerComment`) and the empty `<!---->` comments, its `data-node-id`
 * attributes and the `<ember-outlet>` wrapper tags.
 */
export function stripGxtArtifacts(html: string): string {
  if (!__GXT_MODE__) return html;
  return html
    .replace(/<!--([\s\S]*?)-->/g, (comment, text: string) =>
      text === '' || isGxtMarkerComment(text) ? '' : comment
    )
    .replace(/\s*data-node-id="[^"]*"/g, '')
    .replace(/<\/?ember-outlet[^>]*>/g, '');
}

function generateTokens(containerOrHTML: string | Element) {
  if (typeof containerOrHTML === 'string') {
    let html = containerOrHTML;
    // In GXT mode, also strip empty comments from expected strings
    // since GXT doesn't emit them the same way Glimmer VM does.
    // Also collapse whitespace between tags to match stripGxtArtifacts,
    // which performs the same collapse on the actual DOM innerHTML to
    // clean up whitespace left by removed placeholder comments.
    if (__GXT_MODE__) {
      html = html
        .replace(/<!---->/g, '')
        .replace(/>\s+</g, '><')
        .trim();
    }
    return {
      tokens: tokenize(html),
      html,
    };
  } else {
    let html = stripGxtArtifacts(containerOrHTML.innerHTML);
    if (__GXT_MODE__) {
      // Collapse the whitespace the removals leave between tags.
      html = html.replace(/>\s+</g, '><').trim();
    }
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
        .filter((attr: any) => !__GXT_MODE__ || attr[0] !== 'data-node-id')
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
