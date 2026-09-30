#!/usr/bin/env python3
"""Heuristic check that cited lines contain the construct the surrounding prose names.

For each citation (from check.py's extraction), collect "terms" from the prose around it:
backticked identifiers / code fragments and quoted message text. Then look for each term in the
cited line range (with a small slack). Output classes:
  HIT   - some term found inside the cited range (+/- SLACK lines)
  NEAR  - no term in range but found elsewhere in the file (nearest lines reported)
  MISS  - terms extracted but none found anywhere in the file
  NOID  - no usable terms extracted
Usage: semantic.py chapter.md [--only NEAR,MISS]
"""
import sys, re, os, json
sys.path.insert(0, os.path.dirname(__file__))
import importlib.util
_spec = importlib.util.spec_from_file_location('check', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'check-citations.py'))
check = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check)

SLACK = 2
STOP = set('''true false null undefined this args if else each let with yield in of as new
return class function const var get set and or not the a is to Symbol string number object
Object boolean key value name type id default params hash true'''.split())


def terms_from(text):
    out = []
    for m in re.finditer(r'`([^`]+)`', text):
        t = m.group(1).strip()
        if check.SPAN_RE.match(t) or re.search(r'\.(ts|js|md|rs)(:|$)', t) or t.startswith('§'):
            continue
        # pull identifiers from code-ish spans
        for ident in re.findall(r'[A-Za-z_$@-][\w$-]*', t):
            ident = ident.lstrip('@')
            if len(ident) >= 4 and ident not in STOP and not ident.startswith('-') :
                out.append(ident)
    for m in re.finditer(r'"([^"]{8,})"', text):
        out.append(m.group(1)[:40])
    for m in re.finditer(r'\b([a-z]+[A-Z][A-Za-z]+|[A-Z][a-z]+[A-Z][A-Za-z]+)\b', re.sub(r'`[^`]*`', '', text)):
        out.append(m.group(1))
    seen = []
    for t in out:
        if t not in seen:
            seen.append(t)
    return seen


def file_lines(rel):
    return open(check.abspath(rel), encoding='utf-8', errors='replace').read().split('\n')


def para_context(lines, ln, col):
    """Text of the paragraph from the start of the sentence containing the citation, up to it."""
    a = ln - 1
    while a > 0 and lines[a - 1].strip() and not lines[a - 1].lstrip().startswith(('#', '|', '```')) \
            and not re.match(r'\s*([-*]|\d+\.)\s', lines[a]):
        a -= 1
    text = ' '.join(lines[a:ln - 1] + [lines[ln - 1][:col]])
    # cut at the previous citation span, else previous sentence end
    spans = [m for m in re.finditer(r'`([^`]+)`', text) if check.SPAN_RE.match(m.group(1).strip())]
    cut = 0
    if spans:
        # skip citations immediately adjacent (a list of cites for the same claim)
        tail = text
        for m in reversed(spans):
            between = text[m.end():]
            if re.fullmatch(r'[\s,;()and]*', between):
                text = text[:m.start()]
                continue
            cut = m.end()
            break
    seg = text[cut:]
    if len(re.sub(r'`[^`]*`|[^A-Za-z]', '', seg)) < 12:
        seg = text[max(0, cut - 300):]
    return seg


def candidates(c):
    p = c['path']
    if p is None or check.isabs_existing(p):
        return [c['resolved']]
    suffix = '/' + p.lstrip('/')
    cs = [c['resolved']] + [f for f in check.index() if ('/' + f).endswith(suffix) and f != c['resolved']]
    mx = max(b for a, b in check.parse_ranges(c['ranges']))
    return [x for x in cs if check.nlines(check.abspath(x)) >= mx]


def analyze(chapter):
    cites = check.extract(chapter)
    lines = open(chapter, encoding='utf-8').read().split('\n')
    res = []
    for c in cites:
        if c['status'] != 'ok':
            continue
        ctx = para_context(lines, c['line'], c['col'])
        terms = terms_from(ctx)
        r = dict(c, terms=terms, ctx=ctx[-200:])
        if not terms:
            r['cls'] = 'NOID'
            res.append(r)
            continue
        rngs = check.parse_ranges(c['ranges'])
        best = None
        for cand in candidates(c):
            fl = file_lines(cand)
            inr = [t for t in terms if any(any(t in s for s in fl[max(0, a - 1 - SLACK):b + SLACK]) for a, b in rngs)]
            if inr:
                best = (cand, inr)
                break
        if best:
            r['cls'] = 'HIT' if best[0] == c['resolved'] else 'HITALT'
            r['hit'] = best[1]
            r['altfile'] = best[0]
        else:
            fl = file_lines(c['resolved'])
            near = {}
            for t in terms:
                locs = [i + 1 for i, s in enumerate(fl) if t in s]
                if locs:
                    a = rngs[0][0]
                    near[t] = sorted(locs, key=lambda x: abs(x - a))[:4]
            r['cls'] = 'NEAR' if near else 'MISS'
            r['near'] = near
        res.append(r)
    return res


def main():
    only = None
    args = sys.argv[1:]
    if '--only' in args:
        i = args.index('--only')
        only = set(args[i + 1].split(','))
        args = args[:i] + args[i + 2:]
    for ch in args:
        res = analyze(ch)
        counts = {}
        for r in res:
            counts[r['cls']] = counts.get(r['cls'], 0) + 1
        print(f'== {os.path.basename(ch)} {counts}')
        for r in res:
            if only and r['cls'] not in only:
                continue
            extra = r.get('near') if not r['cls'].startswith('HIT') else r.get('hit')
            alt = f" ALT={r['altfile']}" if r['cls'] == 'HITALT' else ''
            print(f"{r['cls']} L{r['line']} `{r['span']}` -> {r['resolved']}{alt} terms={r['terms'][:6]} {extra}")
            if r['cls'] not in ('HIT', 'HITALT'):
                print('      ctx: ' + r['ctx'].replace('\n', ' ')[-220:])


if __name__ == '__main__':
    main()
