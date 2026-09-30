"""Shift file:line citations after merging new upstream code into the spec branch.

Usage: python3 spec/tools/remap-citations.py OLD_BASE [NEW=HEAD] [--apply]

OLD_BASE is the upstream commit the citations were written against (the previous merge base,
e.g. `git merge-base HEAD~1 origin/main` taken before merging). For every citation into a file
under packages/ that changed between OLD_BASE and NEW, the cited line numbers are moved by the
diff's hunk offsets. A citation whose lines fall inside a changed hunk is reported as FLAG and
left alone: read the new code and fix it by hand, because what it cites may have changed.
Run check-citations.py afterwards.
"""
import json, os, re, subprocess, sys, tempfile
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
OLD = args[0]
NEW = args[1] if len(args) > 1 else 'HEAD'
APPLY = '--apply' in sys.argv
tmp = os.path.join(tempfile.mkdtemp(), 'cites.json')
subprocess.run([sys.executable, 'spec/tools/check-citations.py', '--json', tmp], capture_output=True)
d = json.load(open(tmp))
files = subprocess.run(['git','diff','--name-only',OLD,NEW,'--','packages'],capture_output=True,text=True).stdout.split()
def mapper(f):
    out = subprocess.run(['git','diff','-U0',OLD,NEW,'--',f],capture_output=True,text=True).stdout
    hunks=[]
    for m in re.finditer(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@',out,re.M):
        os_,oc,ns,nc=int(m[1]),int(m[2] or 1),int(m[3]),int(m[4] or 1)
        hunks.append((os_,oc,ns,nc))
    def mp(n):
        delta=0
        for os_,oc,ns,nc in hunks:
            if oc==0:  # pure insertion after line os_
                if n>os_: delta+=nc
                continue
            if n<os_: break
            if os_<=n<os_+oc: return None
            delta+=nc-oc
        return n+delta
    return mp
maps={f:mapper(f) for f in files}
edits={}; flags=[]
for c in d:
    r=c.get('resolved') or ''
    if r not in maps: continue
    mp=maps[r]
    def conv(rng):
        parts=[]
        for p in rng.split(','):
            a,_,b=p.partition('-')
            na=mp(int(a)); nb=mp(int(b)) if b else None
            if na is None or (b and nb is None): return None
            parts.append(f'{na}-{nb}' if b else f'{na}')
        return ','.join(parts)
    new=conv(c['ranges'])
    if new is None:
        flags.append(f"{c['chapter']}:{c['line']} {c['span']} (inside a changed hunk)")
        continue
    if new!=c['ranges']:
        newspan=c['span'][:len(c['span'])-len(c['ranges'])]+new
        edits.setdefault(c['chapter'],[]).append((c['line'],c['span'],newspan))
for ch,es in edits.items():
    for e in es: print(ch, *e)
for f in flags: print('FLAG',f)
if APPLY:
    for ch,es in edits.items():
        lines=open('spec/'+ch).read().split('\n')
        for ln,old,new in es:
            L=lines[ln-1]
            # replace the backticked occurrence only
            i=L.find(old)
            assert i>=0,(ch,ln,old)
            lines[ln-1]=L[:i]+new+L[i+len(old):]
        open('spec/'+ch,'w').write('\n'.join(lines))
    print('applied')
