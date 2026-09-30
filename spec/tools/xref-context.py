"""List every §-cross-reference with its surrounding text and the heading it resolves to.

Usage: python3 spec/tools/xref-context.py [chapter.md ...]

For each reference prints:  file:line  §ref  ->  target heading
followed by the referencing line (trimmed). Use it to check by eye that each reference points
at the section the prose means (xref.py only checks that the target exists).
"""
import glob
import os
import re
import sys

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

HEAD = re.compile(r'^#{2,5} (?:0\d-)?(\d+(?:\.\d+)*)\.?\s+(.*)')
heads = {}
for f in sorted(glob.glob('0[0-8]-*.md')):
    table = {}
    for line in open(f):
        m = HEAD.match(line)
        if m:
            table[m.group(1)] = m.group(2).strip()
    heads[f[:2]] = table

files = sys.argv[1:] or sorted(glob.glob('0[0-8]-*.md'))
for f in files:
    f = os.path.basename(f)
    for i, line in enumerate(open(f), 1):
        refs = []
        for m in re.finditer(r'§ ?(0[0-8])[-.](\d+(?:\.\d+)*)', line):
            refs.append((m.group(1), m.group(2).rstrip('.'), m.group(0)))
        for m in re.finditer(r'§(\d+(?:\.\d+)*)(?![-\d])', line):
            sec = m.group(1).rstrip('.')
            if len(sec) >= 2 and sec.startswith('0'):
                continue
            refs.append((f[:2], sec, m.group(0)))
        for ch, sec, text in refs:
            target = heads.get(ch, {}).get(sec, '??? MISSING')
            print(f'{f}:{i}  {text}  ->  §{ch}-{sec} {target}')
            print(f'    {line.strip()[:220]}')
