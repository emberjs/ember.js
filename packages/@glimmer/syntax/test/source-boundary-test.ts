import { src } from '@glimmer/syntax';

const { test } = QUnit;

QUnit.module('[glimmer-syntax] Source - hbsPosFor / charPosFor boundaries');

test('empty source', (assert) => {
  const s = new src.Source('');

  assert.deepEqual(s.hbsPosFor(0), { line: 1, column: 0 });
  assert.strictEqual(s.hbsPosFor(1), null);

  assert.strictEqual(s.charPosFor({ line: 1, column: 0 }), 0);
  assert.strictEqual(s.charPosFor({ line: 2, column: 0 }), null);
});

test('single char, no newline', (assert) => {
  const s = new src.Source('a');

  assert.deepEqual(s.hbsPosFor(0), { line: 1, column: 0 });
  assert.deepEqual(s.hbsPosFor(1), { line: 1, column: 1 });
  assert.strictEqual(s.hbsPosFor(2), null);

  assert.strictEqual(s.charPosFor({ line: 1, column: 0 }), 0);
  assert.strictEqual(s.charPosFor({ line: 1, column: 1 }), 1);
  assert.strictEqual(s.charPosFor({ line: 2, column: 0 }), null);
});

test('single newline', (assert) => {
  const s = new src.Source('\n');

  assert.deepEqual(s.hbsPosFor(0), { line: 1, column: 0 });
  assert.deepEqual(s.hbsPosFor(1), { line: 2, column: 0 });
  assert.strictEqual(s.hbsPosFor(2), null);

  assert.strictEqual(s.charPosFor({ line: 1, column: 0 }), 0);
  assert.strictEqual(s.charPosFor({ line: 2, column: 0 }), 1);
  assert.strictEqual(s.charPosFor({ line: 3, column: 0 }), null);
});

test('multi-line fixtures round-trip at boundaries', (assert) => {
  // For each fixture: [offset, expected {line, column} | null] pairs cover
  // every offset from 0 to length+1 — start, middles, the '\n', and past-end.
  const cases: Array<[string, Array<[number, { line: number; column: number } | null]>]> = [
    [
      'a\n',
      [
        [0, { line: 1, column: 0 }],
        [1, { line: 1, column: 1 }],
        [2, { line: 2, column: 0 }],
        [3, null],
      ],
    ],
    [
      'a\nb',
      [
        [0, { line: 1, column: 0 }],
        [2, { line: 2, column: 0 }],
        [3, { line: 2, column: 1 }],
        [4, null],
      ],
    ],
    [
      'a\nb\n',
      [
        [3, { line: 2, column: 1 }],
        [4, { line: 3, column: 0 }],
        [5, null],
      ],
    ],
  ];

  for (const [input, pairs] of cases) {
    const s = new src.Source(input);
    for (const [offset, expected] of pairs) {
      assert.deepEqual(
        s.hbsPosFor(offset),
        expected,
        `hbsPosFor(${offset}) of ${JSON.stringify(input)}`
      );
      if (expected !== null) {
        assert.strictEqual(
          s.charPosFor(expected),
          offset,
          `charPosFor round-trip for offset ${offset} of ${JSON.stringify(input)}`
        );
      }
    }
  }
});

test('charPosFor clamps column past line-end to line-end', (assert) => {
  const s = new src.Source('hello\nworld');

  // line 1 has length 5; column 99 should clamp to the newline offset (5).
  assert.strictEqual(s.charPosFor({ line: 1, column: 99 }), 5);
  // line 2 has length 5; column 99 should clamp to source.length (11).
  assert.strictEqual(s.charPosFor({ line: 2, column: 99 }), 11);
});

test('charPosFor returns null for negative or out-of-range lines', (assert) => {
  const s = new src.Source('a\nb\nc');

  assert.strictEqual(s.charPosFor({ line: 0, column: 0 }), null, 'line 0');
  assert.strictEqual(s.charPosFor({ line: -1, column: 0 }), null, 'negative line');
  assert.strictEqual(s.charPosFor({ line: 4, column: 0 }), null, 'line past end');
  assert.strictEqual(s.charPosFor({ line: 1, column: -1 }), null, 'negative column');
});

test('hbsPosFor returns null for negative or out-of-range offsets', (assert) => {
  const s = new src.Source('abc');

  assert.strictEqual(s.hbsPosFor(-1), null, 'negative offset');
  assert.strictEqual(s.hbsPosFor(4), null, 'offset past length');
  assert.strictEqual(s.hbsPosFor(100), null, 'offset far past length');
});

test('hbsPosFor at exact newline offset points to that line', (assert) => {
  const s = new src.Source('ab\ncd');

  // Offset 2 *is* the '\n' — it belongs to line 1 at column 2.
  assert.deepEqual(s.hbsPosFor(2), { line: 1, column: 2 });
  // Offset 3 is the first char after the newline — line 2, column 0.
  assert.deepEqual(s.hbsPosFor(3), { line: 2, column: 0 });
});
