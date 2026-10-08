#!/usr/bin/env python3
"""Test-coverage scan of the spec (§09).

For every section of the normative chapters, counts the `path:line` citations that point at
test files and those that point at source, and collects the markers chapters use for claims
without an upstream test ("untested", "by experiment", "no upstream test", ...).

Usage: test-coverage.py [--markdown out.md]

A section is classified as
  T  cites at least one test file
  S  cites source only
  X  carries an "untested" / "by experiment" marker and cites no test
  -  cites nothing (definitions, prose, or headings with only subsections)
  i  informative / [Proposed] / non-normative (not counted)
Leaf sections only: a heading whose body is empty before its first subsection is skipped.
"""

import re
import sys
from pathlib import Path

SPEC = Path(__file__).resolve().parent.parent
CHAPTERS = [
    '01-authoring-formats.md',
    '02-syntax.md',
    '03-static-semantics.md',
    '05-runtime-semantics.md',
    '06-managers.md',
    '07-reactivity.md',
    '08-ember-integration.md',
]

HEADING = re.compile(r'^(#{2,5})\s+(.*)$')
CITATION = re.compile(r'`([A-Za-z0-9_@./\-]+\.(?:ts|js|mjs|gjs|gts|rs|hbs|md))(?::[\d,\-]+)?`')
TEST_PATH = re.compile(r'(/tests?/|-test\.|_test\.|\.test\.|/integration-tests/)')
MARKERS = re.compile(
    r'(\(untested\)|\buntested\b|by experiment|no upstream test|not (?:currently )?tested|'
    r'nothing tests|no test (?:pins|covers|asserts)|LOCAL_DEBUG)',
    re.I,
)
INFORMATIVE = re.compile(r'(informative|\[Proposed\]|Proposed\b|non-normative|Open questions)', re.I)


def sections(path):
    lines = path.read_text().split('\n')
    heads = [(i, m.group(1), m.group(2)) for i, l in enumerate(lines) if (m := HEADING.match(l))]
    out = []
    for k, (i, hashes, title) in enumerate(heads):
        end = heads[k + 1][0] if k + 1 < len(heads) else len(lines)
        body = lines[i + 1 : end]
        out.append((i + 1, len(hashes), title.strip(), body))
    return out


def classify(title, body, parents):
    text = '\n'.join(body)
    if not text.strip():
        return None
    if any(INFORMATIVE.search(t) for t in parents + [title]):
        return 'i', 0, 0, []
    cites = CITATION.findall(text)
    tests = [c for c in cites if TEST_PATH.search(c)]
    src = len(cites) - len(tests)
    markers = sorted({m.lower() for m in MARKERS.findall(text)})
    if tests:
        cls = 'T'
    elif markers:
        cls = 'X'
    elif src:
        cls = 'S'
    else:
        cls = '-'
    return cls, len(tests), src, markers


def main():
    md = None
    if '--markdown' in sys.argv:
        md = sys.argv[sys.argv.index('--markdown') + 1]
    rows = []
    for ch in CHAPTERS:
        stack = []
        for line, level, title, body in sections(SPEC / ch):
            stack = [s for s in stack if s[0] < level] + [(level, title)]
            r = classify(title, body, [t for _, t in stack[:-1]])
            if r is None:
                continue
            cls, nt, ns, markers = r
            rows.append((ch, line, title, cls, nt, ns, len(body), markers))

    summary = {}
    for ch, *_rest in rows:
        summary.setdefault(ch, {'T': 0, 'S': 0, 'X': 0, '-': 0, 'i': 0})
    for ch, line, title, cls, *_ in rows:
        summary[ch][cls] += 1

    out = []
    out.append('| Chapter | T (tested) | S (source only) | X (marked untested) | - (no citation) | i (informative) |')
    out.append('|---|---|---|---|---|---|')
    for ch in CHAPTERS:
        s = summary.get(ch, {})
        out.append(f"| {ch} | {s.get('T',0)} | {s.get('S',0)} | {s.get('X',0)} | {s.get('-',0)} | {s.get('i',0)} |")
    out.append('')
    for cls, name in [('X', 'Marked untested or verified only by experiment'), ('S', 'Source citations only'), ('-', 'No citations')]:
        out.append(f'### {name} ({cls})')
        out.append('')
        out.append('| Chapter | Line | Section | Body lines | Markers |')
        out.append('|---|---|---|---|---|')
        for ch, line, title, c, nt, ns, n, markers in rows:
            if c == cls:
                out.append(f"| {ch[:2]} | {line} | {title} | {n} | {', '.join(markers)} |")
        out.append('')
    # Sections that cite tests but still carry markers (partial coverage).
    out.append('### Tested sections that still carry markers (T + marker)')
    out.append('')
    out.append('| Chapter | Line | Section | Markers |')
    out.append('|---|---|---|---|')
    for ch, line, title, c, nt, ns, n, markers in rows:
        if c == 'T' and markers:
            out.append(f"| {ch[:2]} | {line} | {title} | {', '.join(markers)} |")
    text = '\n'.join(out) + '\n'
    if md:
        Path(md).write_text(text)
    print('\n'.join(out[: len(CHAPTERS) + 2]))


if __name__ == '__main__':
    main()
