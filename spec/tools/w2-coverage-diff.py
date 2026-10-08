#!/usr/bin/env python3
"""W2 exit check 8.3: per-test diff of a full-suite run against the W2 baseline, matched to the ledger.

Usage: w2-coverage-diff.py RUN.tap [BASELINE.tsv] [LEDGER.md]

RUN.tap is a testem tap log with source-chunk suffixes (the recipe is in w2-baseline-parse.py).
Defaults: spec/.work/W2-baseline-tests.tsv and spec/.work/W2-coverage-ledger.md.

Steps:
  1. Missing = baseline tests not in the run; new = run tests not in the baseline. A test is
     (module, name) with date stamps normalised (the Helpers tests embed `new Date()`); the source
     chunk is ignored, so a test that kept its name but moved file is not reported.
  2. Moves: a missing and a new test with the same leaf name (the part after
     `[integration] <Kind>: `, else after the last `: `) and the same kind are paired as a rename or
     move (suite renamed, module renamed, test moved to another file). Printed grouped by
     (old prefix -> new prefix) for review.
  3. Every other missing or new test must have its leaf name in the ledger (case-insensitive,
     whitespace collapsed, `\\|` unescaped). A missing Curly/Dynamic registration must match a
     ledger line that also says Curly or Dynamic. Leaves shorter than 20 characters are listed as
     "weak" (a substring match is not proof).
  4. GROUPED: missing tests covered by one grouped ledger row instead of a row per test. Each is
     accepted only if a test with the same leaf name still runs (under another module).
Prints unmatched tests in both directions; exit status 1 if any.
"""
import collections, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, '..', '.work')
run = sys.argv[1]
base = sys.argv[2] if len(sys.argv) > 2 else os.path.join(WORK, 'W2-baseline-tests.tsv')
ledger = sys.argv[3] if len(sys.argv) > 3 else os.path.join(WORK, 'W2-coverage-ledger.md')


def nz(x):
    x = re.sub(r'\d{4}-\d\d-\d\dT[\d:.]+Z', 'D', x)
    return re.sub(r'\w{3} \w{3} \d\d \d{4} [^)]*\)', 'D', x).strip()


def load_tap(p):
    recs, rows = [], []
    for l in open(p).read().split('\n'):
        if re.match(r'^(ok|not ok|skip) \d+ Chrome ', l):
            recs.append(l)
        elif recs and not (l.startswith('#') or l.startswith('1..') or l.startswith('npm ') or l == ''):
            recs[-1] += ' ' + l.strip()
    for l in recs:
        m = re.match(r'^(ok|not ok|skip) \d+ Chrome [\d.]+ - \[\d+ ms\] - (.*) @@(\S*)(?: --- .*)?\s*$', l)
        if m:
            mod, _, name = m.group(2).partition(': ')
            rows.append((mod, name.replace('\t', ' '), {'ok': 'pass', 'not ok': 'fail', 'skip': 'skip'}[m.group(1)]))
    return rows


def load_tsv(p):
    return [tuple(l.rstrip('\n').split('\t'))[:3] for l in list(open(p))[1:]]


def leaf(name):
    m = re.search(r'\[integration\] (\w+): (.*)$', name)
    if m:
        return m.group(1), m.group(2).strip()
    return '', name.rsplit(': ', 1)[-1].strip()


def norm(s):
    return re.sub(r'\s+', ' ', s.replace('\\|', '|')).strip().lower()


a, b = load_tsv(base), load_tap(run)
ca = collections.Counter((m, nz(n)) for m, n, _ in a)
cb = collections.Counter((m, nz(n)) for m, n, _ in b)
missing, new = list((ca - cb).elements()), list((cb - ca).elements())
print(f'baseline {len(a)}  run {len(b)} ({collections.Counter(r[2] for r in b)})')
print(f'missing {len(missing)}  new {len(new)}')

# 2. pair moves/renames by (kind, leaf)
newidx = collections.defaultdict(list)
for t in new:
    newidx[leaf(t[1])].append(t)
moves, rest_missing = [], []
for t in missing:
    k = leaf(t[1])
    if newidx.get(k):
        moves.append((t, newidx[k].pop()))
    else:
        rest_missing.append(t)
rest_new = [t for v in newidx.values() for t in v]


def prefix(t):
    mod, name = t
    return mod + ' | ' + (name.split(' > ')[0] if ' > ' in name else name.rsplit(': ', 1)[0])


groups = collections.Counter((prefix(o), prefix(n)) for o, n in moves)
print(f'\n== moves/renames paired by leaf name: {len(moves)}')
for (o, n), c in sorted(groups.items()):
    print(f'  {c:4}  {o}  ->  {n}')

# 3. ledger lookup
lines = [norm(l) for l in open(ledger) if l.startswith('|')]
text = '\n'.join(lines)


def in_ledger(t, need_kind=False):
    kind, lf = leaf(t[1])
    n = norm(lf)
    if need_kind and kind in ('Curly', 'Dynamic'):
        return any(n in l and ('curly' in l or 'dynamic' in l) for l in lines)
    return n in text


# (name prefix, ledger row it stands for)
GROUPED = [
    ('Components - [emberjs/ember.js#15675] - type value min max: ',
     '4.4 row "33 tests inherited from AttributesTests" (fake-curly RangeTests subclass)'),
]
run_leaves = collections.Counter(leaf(n)[1] for _, n, _ in b)


def grouped(t):
    for pre, row in GROUPED:
        if t[1].startswith(pre) and run_leaves[leaf(t[1])[1]] > 0:
            return row
    return None


def report(title, items, need_kind):
    un, weak, ok, grp = [], [], 0, collections.Counter()
    for t in items:
        g = grouped(t) if need_kind else None
        if g and not in_ledger(t, need_kind):
            grp[g] += 1
        elif in_ledger(t, need_kind):
            ok += 1
            if len(leaf(t[1])[1]) < 20:
                weak.append(t)
        else:
            un.append(t)
    print(f'\n== {title}: {len(items)}, in ledger {ok}, grouped {sum(grp.values())}, unmatched {len(un)}, weak {len(weak)}')
    for g, c in grp.items():
        print(f'  grouped  {c:4}  {g}')
    for t in un:
        print('  UNMATCHED', t)
    for t in weak:
        print('  weak     ', t)
    return un


u1 = report('missing (not a move)', rest_missing, True)
u2 = report('new (not a move)', rest_new, False)
sys.exit(1 if u1 or u2 else 0)
