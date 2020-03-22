import { tokenize } from 'simple-html-tokenizer';

function generateTokens(containerOrHTML) {
  if (typeof containerOrHTML === 'string') {
    return {
      tokens: tokenize(containerOrHTML),
      html: containerOrHTML,
    };
  } else {
    return {
      tokens: tokenize(containerOrHTML.innerHTML),
      html: containerOrHTML.innerHTML,
    };
  }
}

function normalizeTokens(tokens) {
  tokens.forEach(token => {
    if (token.type === 'StartTag') {
      token.attributes = token.attributes.sort((a, b) => {
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

export default function equalTokens(actualContainer, expectedHTML, message = null) {
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
