import re, glob, os, collections
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
heads = {}
for f in sorted(glob.glob('0[0-8]-*.md')):
    ch = f[:2]
    s = set()
    for line in open(f):
        m = re.match(r'^#{2,5} (?:0\d-)?(\d+(?:\.\d+)*)\.?\s', line)
        if m: s.add(m.group(1))
    heads[ch] = s
bad = collections.defaultdict(list)
for f in sorted(glob.glob('0[0-8]-*.md')):
    for i, line in enumerate(open(f), 1):
        for m in re.finditer(r'§ ?(0[0-8])[-.](\d+(?:\.\d+)*)', line):
            ch, sec = m.group(1), m.group(2).rstrip('.')
            if sec not in heads.get(ch, ()):
                bad[f].append((i, f'§{ch}-{sec}'))
        # same-chapter refs like §3.2 (no chapter prefix)
        for m in re.finditer(r'§(\d+(?:\.\d+)*)(?![-\d])', line):
            sec = m.group(1).rstrip('.')
            if len(sec) >= 2 and sec.startswith('0') : continue
            if sec not in heads[f[:2]]:
                bad[f].append((i, f'§{sec} (local)'))
for f, lst in bad.items():
    print(f, len(lst))
    for i, r in lst: print('  ', i, r)
