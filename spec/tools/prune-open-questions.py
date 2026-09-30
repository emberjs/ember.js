"""Remove open-question items marked `<!-- REMOVE -->`, renumber, and rewrite references.

Usage: python3 spec/tools/prune-open-questions.py [--apply]

Without --apply it only reports: the old→new numbering of each list, and every reference that
points at a removed item (these need a hand edit before applying, or they will be left as-is
and reported again). With --apply it rewrites the chapters and STATUS.md.

Numbered lists (renumbered): §00-0.7 (one sequence across 0.7.1–0.7.9), §01-1.11, §02-11,
§03-10, §04-4.14, §05-14, §07-5. Q-lists (§06-12, §08-14) keep their Q numbers as stable IDs;
marked Q blocks are only deleted.
"""
import os
import re
import sys

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
APPLY = '--apply' in sys.argv
MARK = '<!-- REMOVE -->'

# list id -> (file, start-heading regex, end regex, reference prefixes)
LISTS = {
    '00': ('00-overview.md', r'^### 0\.7\.1 ', r'^### 0\.7\.10 ',
           [r'§00-0\.7(?:\.\d+)?', r'§0\.7(?:\.\d+)?', r'(?<![§\d.])0\.7\.\d+']),
    '01': ('01-authoring-formats.md', r'^## 1\.11 |^### 1\.11 ', r'^## ', [r'§01-1\.11']),
    '02': ('02-syntax.md', r'^## 11\. Open questions', r'^## ', [r'§02-11']),
    '03': ('03-static-semantics.md', r'^## 03-10 ', r'^## ', [r'§03-10']),
    '04': ('04-wire-format.md', r'^## 4\.14 ', r'^## ', [r'§04-4\.14']),
    '05': ('05-runtime-semantics.md', r'^## 14\. ', r'^## ', [r'§05-14']),
    '07': ('07-reactivity.md', r'^## 07-5 ', r'^## ', [r'§07-5']),
}
LOCAL = {'01': r'§1\.11', '02': r'§11', '03': r'§10', '04': r'§4\.14', '05': r'§14', '07': r'§5'}
QLISTS = {'06': ('06-managers.md', r'^- (?:<!-- REMOVE -->)?\*\*Q\d+|^<!-- REMOVE -->- \*\*Q\d+'),
          '08': ('08-ember-integration.md', r'^(?:<!-- REMOVE -->)?\*\*Q\d+')}

ITEM = re.compile(r'^(?:<!-- REMOVE -->)?(\d+)\. ')


def region(lines, start_re, end_re):
    start = next(i for i, l in enumerate(lines) if re.search(start_re, l))
    end = next((i for i in range(start + 1, len(lines)) if re.search(end_re, lines[i])), len(lines))
    return start, end


def process_list(lid):
    fname, start_re, end_re, _ = LISTS[lid]
    lines = open(fname).read().split('\n')
    start, end = region(lines, start_re, end_re)
    mapping, removed, new_lines, n = {}, set(), [], 0
    i = 0
    out = lines[:start + 1]
    i = start + 1
    while i < end:
        line = lines[i]
        m = ITEM.match(line)
        if m:
            old = int(m.group(1))
            # item extent: until next item start, heading, or a non-indented non-blank line
            j = i + 1
            while j < end and not ITEM.match(lines[j]) and not lines[j].startswith('#') and \
                    (lines[j] == '' or lines[j].startswith(' ')):
                j += 1
            block = lines[i:j]
            if line.startswith(MARK):
                removed.add(old)
                mapping[old] = None
                # drop a trailing blank only if the previous kept line is blank too
            else:
                n += 1
                mapping[old] = n
                block[0] = re.sub(r'^\d+\. ', f'{n}. ', block[0])
                if len(f'{n}') != len(f'{old}'):
                    pass
                out.extend(block)
            i = j
        else:
            out.append(line)
            i += 1
    out.extend(lines[end:])
    return fname, out, mapping


def process_qlist(qid):
    fname, q_re = QLISTS[qid]
    lines = open(fname).read().split('\n')
    out, i, removed = [], 0, []
    qstart = re.compile(q_re)
    while i < len(lines):
        if lines[i].startswith(MARK) and qstart.match(lines[i]):
            removed.append(re.search(r'Q(\d+)', lines[i]).group(1))
            j = i + 1
            while j < len(lines) and not qstart.match(lines[j]) and not lines[j].startswith('#'):
                j += 1
            # keep one blank separator
            i = j
            continue
        out.append(lines[i])
        i += 1
    return fname, out, removed


NUMS = r'(\d+(?:\s*[–-]\s*\d+)?(?:(?:,\s*|\s+and\s+|/)\d+(?:\s*[–-]\s*\d+)?)*)'


def expand(nums):
    parts = re.split(r'(,\s*|\s+and\s+|/)', nums)
    vals = []
    for p in parts[::2]:
        r = re.match(r'(\d+)\s*[–-]\s*(\d+)', p)
        if r:
            vals.extend(range(int(r.group(1)), int(r.group(2)) + 1))
        else:
            vals.append(int(p))
    return vals


def fmt(vals):
    vals = sorted(set(vals))
    out, k = [], 0
    while k < len(vals):
        j = k
        while j + 1 < len(vals) and vals[j + 1] == vals[j] + 1:
            j += 1
        out.append(f'{vals[k]}–{vals[j]}' if j - k >= 2 else ', '.join(str(v) for v in vals[k:j + 1]))
        k = j + 1
    return ', '.join(out)


def rewrite_refs(text, prefixes, mapping, where, problems):
    for pre in prefixes:
        pat = re.compile(r'(' + pre + r')(,?\s+)(items?|item)\s+' + NUMS)

        def sub(m):
            vals = expand(m.group(4))
            new = []
            for v in vals:
                if v not in mapping:
                    problems.append(f'{where}: {m.group(0)!r}: {v} is not an item of the list')
                    new.append(v)
                elif mapping[v] is None:
                    problems.append(f'{where}: {m.group(0)!r} refers to removed item {v}')
                    new.append(v)
                else:
                    new.append(mapping[v])
            word = 'item' if len(set(new)) == 1 else 'items'
            return f'{m.group(1)}{m.group(2)}{word} {fmt(new)}'
        text = pat.sub(sub, text)
    return text


def main():
    results, problems = {}, []
    for lid in LISTS:
        fname, out, mapping = process_list(lid)
        results[lid] = (fname, out, mapping)
        changed = {k: v for k, v in mapping.items() if k != v}
        print(f'{lid} {fname}: {len(mapping)} items, {sum(v is None for v in mapping.values())} removed;',
              'renumbered:', changed or 'none')
    qresults = {}
    for qid in QLISTS:
        fname, out, removed = process_qlist(qid)
        qresults[qid] = (fname, out)
        print(f'{qid} {fname}: removing Q{", Q".join(removed) if removed else " none"}')
    # new texts: start from processed list files, then rewrite references everywhere
    texts = {}
    for f in [f for f in sorted(os.listdir('.')) if re.match(r'0[0-8]-.*\.md$', f)] + ['STATUS.md']:
        texts[f] = open(f).read()
    for lid, (fname, out, _) in results.items():
        texts[fname] = '\n'.join(out)
    for qid, (fname, out) in qresults.items():
        texts[fname] = '\n'.join(out)
    for f in texts:
        for lid, (fname, _, mapping) in results.items():
            prefixes = list(LISTS[lid][3])
            if f == fname and lid in LOCAL:
                prefixes.append(LOCAL[lid] + r'(?![\d.-])')
            texts[f] = rewrite_refs(texts[f], prefixes, mapping, f, problems)
    left = [f'{f}: marker left' for f, t in texts.items() if MARK in t]
    for p in problems + left:
        print('PROBLEM', p)
    if APPLY:
        for f, t in texts.items():
            if t != open(f).read():
                open(f, 'w').write(t)
        print('applied')


main()
