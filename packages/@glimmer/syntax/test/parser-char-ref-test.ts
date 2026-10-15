import type { ASTv1 } from '@glimmer/syntax';
import { preprocess as parse } from '@glimmer/syntax';

const { module, test } = QUnit;

function textOf(template: string): string {
  let node = parse(template).body[0] as ASTv1.TextNode;
  return node.chars;
}

function attrTextOf(template: string): string {
  let element = parse(template).body[0] as ASTv1.ElementNode;
  let value = element.attributes[0]?.value as ASTv1.TextNode;
  return value.chars;
}

function codePoints(s: string): string[] {
  return [...s].map(
    (c) => `U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`
  );
}

const CASES: Array<[source: string, expected: string, description: string]> = [
  ['&#65;', 'A', 'decimal BMP code point'],
  ['&#x41;', 'A', 'hex BMP code point'],
  ['&#X41;', 'A', 'uppercase X hex prefix'],
  ['&#128512;', '\u{1F600}', 'decimal astral code point'],
  ['&#x1F600;', '\u{1F600}', 'hex astral code point'],
  ['&#x10FFFF;', '\u{10FFFF}', 'maximum code point'],
  ['&#0;', '\uFFFD', 'NUL is replaced'],
  ['&#xD800;', '\uFFFD', 'lone high surrogate is replaced'],
  ['&#xDFFF;', '\uFFFD', 'lone low surrogate is replaced'],
  ['&#x110000;', '\uFFFD', 'code point beyond Unicode range is replaced'],
  ['&#x110041;', '\uFFFD', 'out-of-range code point does not wrap'],
  ['&#99999999999999999999;', '\uFFFD', 'absurdly large code point is replaced'],
  ['&#128;', '\u20AC', 'C1 0x80 is remapped to euro sign'],
  ['&#146;', '\u2019', 'C1 0x92 is remapped to right single quote'],
  ['&#150;', '\u2013', 'C1 0x96 is remapped to en dash'],
  ['&#x9F;', '\u0178', 'C1 0x9F is remapped'],
  ['&#x81;', '\u0081', 'C1 code point without a Windows-1252 mapping is kept'],
  ['&#x7F;', '\u007F', 'DEL is kept'],
];

module('[glimmer-syntax] Parser - numeric character references', function () {
  for (let [source, expected, description] of CASES) {
    test(`text: ${source} (${description})`, (assert) => {
      assert.deepEqual(codePoints(textOf(source)), codePoints(expected));
    });

    test(`attribute: ${source} (${description})`, (assert) => {
      assert.deepEqual(
        codePoints(attrTextOf(`<div title="${source}"></div>`)),
        codePoints(expected)
      );
    });
  }

  test('numeric references mix with surrounding text', (assert) => {
    assert.strictEqual(
      textOf('Don&#146;t miss the 9&#150;5 shift &#x1F600;'),
      'Don\u2019t miss the 9\u20135 shift \u{1F600}'
    );
  });

  test('named references still decode', (assert) => {
    assert.strictEqual(textOf('&amp;&lt;&nbsp;&rsquo;'), '&<\u00A0\u2019');
  });

  test('codemod mode leaves numeric references undecoded', (assert) => {
    let node = parse('&#128512;', { mode: 'codemod' }).body[0] as ASTv1.TextNode;
    assert.strictEqual(node.chars, '&#128512;');
  });
});
