#!/usr/bin/env python3
"""Extract and check source citations in the Ember template-language spec.

Usage: check.py [--json out.json] [chapter.md ...]
"""
import os, re, sys, json, subprocess, functools

HACK = '/Users/edward/hacking'
REPO = f'{HACK}/ember.js'
SPEC = f'{REPO}/spec'
SIBLINGS = ['babel-plugin-ember-template-compilation', 'content-tag', 'ember-cli-fastboot', 'rfcs', 'simple-html-tokenizer']

EXT = r'(?:ts|js|mjs|cjs|md|rs|l|yy|json|hbs|gjs|gts|d\.ts)'
RANGE = r'\d+(?:-\d*)?\+?'
RANGES = rf'{RANGE}(?:\s*,\s*{RANGE})*'
PATHRE = rf'[A-Za-z0-9_@.$/-]*[A-Za-z0-9_@$-]\.{EXT}'
# span: optional label word(s), optional ellipsis prefix, path, :ranges
SPAN_RE = re.compile(rf'^(?:(?P<label>[a-z]+)\s+)?(?P<ell>…/?)?(?P<path>{PATHRE})?:(?P<ranges>{RANGES})$')


def git_files(root):
    try:
        out = subprocess.run(['git', 'ls-files'], cwd=root, capture_output=True, text=True).stdout
    except Exception:
        return []
    return out.split('\n')


@functools.lru_cache(None)
def index():
    files = [f for f in git_files(REPO) if f]
    for s in SIBLINGS:
        files += [f'{s}/{f}' for f in git_files(f'{HACK}/{s}') if f]
    return files


def abspath(p):
    for base in (REPO, HACK, f'{REPO}/node_modules'):
        if os.path.isfile(f'{base}/{p}'):
            return f'{base}/{p}'
    return f'{REPO}/{p}'


def isabs_existing(p):
    return '/' in p and any(os.path.isfile(f'{b}/{p}') for b in (REPO, HACK, f'{REPO}/node_modules'))


def isdir_existing(p):
    return '/' in p and any(os.path.isdir(f'{b}/{p.rstrip("/")}') for b in (REPO, HACK))


@functools.lru_cache(None)
def nlines(ap):
    with open(ap, 'rb') as f:
        data = f.read()
    n = data.count(b'\n')
    if data and not data.endswith(b'\n'):
        n += 1
    return n


def resolve(path, history, dirs, ranges):
    """Return (resolved_repo_relative_path, how) or (None, reason).

    Bare/partial names are resolved by preference: most recent full path mentioned in
    the chapter with that suffix, then a recently mentioned directory, then the repo
    index. Among those, the first candidate whose length fits the cited range wins
    ("-alt" marks that a later candidate was used because an earlier one did not fit).
    """
    if isabs_existing(path):
        return path, 'direct'
    suffix = '/' + path.lstrip('/')
    ordered = []
    for h in reversed(history):
        if ('/' + h).endswith(suffix) and h not in ordered:
            ordered.append((h, 'history'))
    for d in reversed(dirs):
        cand = d.rstrip('/') + '/' + path
        if isabs_existing(cand):
            ordered.append((cand, 'dir'))
    idx = [f for f in index() if ('/' + f).endswith(suffix) and not f.startswith('type-tests/')]
    for f in idx:
        ordered.append((f, 'index' if len(idx) == 1 else 'ambiguous'))
    if not ordered:
        return None, 'missing'
    mx = max(b for a, b in parse_ranges(ranges))
    for i, (c, how) in enumerate(ordered):
        if nlines(abspath(c)) >= mx:
            return c, how + ('-alt' if i else '')
    return ordered[0]


def parse_ranges(s):
    out = []
    for part in re.split(r'\s*,\s*', s):
        part = part.rstrip('+')
        if '-' in part:
            a, b = part.split('-', 1)
            out.append((int(a), int(b) if b else int(a)))
        else:
            out.append((int(part), int(part)))
    return out


def extract(chapter):
    text = open(chapter, encoding='utf-8').read()
    lines = text.split('\n')
    history = []
    dirs = []
    last = None
    cites = []
    in_code = False
    for ln, line in enumerate(lines, 1):
        if line.lstrip().startswith('```'):
            in_code = not in_code
            continue
        if in_code:
            continue
        for m in re.finditer(r'`([^`]+)`', line):
            span = m.group(1).strip()
            span = re.sub(r'^\.\.\./?', '…/', span)
            sm = SPAN_RE.match(span)
            if not sm:
                bare = span.split(':')[0]
                if re.fullmatch(r'[A-Za-z0-9_@.$/-]+', bare):
                    if isabs_existing(bare):
                        history.append(bare); last = bare
                    elif isdir_existing(bare):
                        dirs.append(bare)
                continue
            path = sm.group('path')
            ranges = sm.group('ranges')
            rec = dict(chapter=os.path.basename(chapter), line=ln, span=span, col=m.start(),
                       path=path, ranges=ranges, context=line)
            if path is None:
                if last is None:
                    rec.update(status='nobase')
                    cites.append(rec)
                    continue
                resolved, how = last, 'continuation'
            else:
                resolved, how = resolve(path, history, dirs, ranges)
            rec['resolved'] = resolved
            rec['how'] = how
            if resolved is None:
                rec['status'] = 'nofile'
                cites.append(rec)
                continue
            if how == 'direct':
                history.append(resolved)
            last = resolved
            n = nlines(abspath(resolved))
            rec['nlines'] = n
            bad = [r for r in parse_ranges(ranges) if r[0] < 1 or r[1] > n or r[0] > r[1]]
            rec['status'] = 'range' if bad else 'ok'
            cites.append(rec)
    return cites


def main():
    args = sys.argv[1:]
    out = None
    if args[:1] == ['--json']:
        out = args[1]
        args = args[2:]
    chapters = args or sorted(f'{SPEC}/{f}' for f in os.listdir(SPEC) if re.match(r'\d\d-.*\.md$', f))
    allc = []
    for ch in chapters:
        c = extract(ch)
        allc += c
        counts = {}
        for r in c:
            counts[r['status']] = counts.get(r['status'], 0) + 1
        print(f'{os.path.basename(ch)}: total={len(c)} ' + ' '.join(f'{k}={v}' for k, v in sorted(counts.items())))
    for r in allc:
        if r['status'] != 'ok':
            print(f"  {r['chapter']}:{r['line']} [{r['status']}] `{r['span']}` -> {r.get('resolved')} {r.get('how','')} n={r.get('nlines')}")
    if out:
        json.dump(allc, open(out, 'w'), indent=1)


if __name__ == '__main__':
    main()
