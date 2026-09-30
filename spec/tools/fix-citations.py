#!/usr/bin/env python3
"""Apply citation fixes: fix.py chapter 'old-span' 'new-span' [...]. Replaces backticked span; must be unique unless --all."""
import sys, re, os
args = sys.argv[1:]
allflag = '--all' in args
args = [a for a in args if a != '--all']
ch = args[0]
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ch)
s = open(p, encoding='utf-8').read()
log = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixes.log'), 'a')
for old, new in zip(args[1::2], args[2::2]):
    o, n = f'`{old}`', f'`{new}`'
    c = s.count(o)
    if c == 0 or (c > 1 and not allflag):
        print(f'SKIP {ch}: {old} count={c}')
        continue
    s = s.replace(o, n)
    print(f'OK {ch}: {old} -> {new} (x{c})')
    log.write(f'{ch}\t{old}\t{new}\t{c}\n')
open(p, 'w', encoding='utf-8').write(s)
