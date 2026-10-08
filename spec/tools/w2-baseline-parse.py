"""Parse a testem tap log of the Ember browser suite into per-test and per-module TSVs (W2).

Produce the log (in the worktree, after `npx vite build --mode development --minify false`):
  1. Copy dist/index.html to dist/map.html and insert, before the `index.html-*.js` script tag,
     an inline module script that polls for window.QUnit and then runs
       QUnit.testStart(params => { let m = String(QUnit.config.current.stack).match(/(\/assets\/[^\s:)]+)/);
                                   params.name += ' @@' + (m ? m[1] : '?'); });
     (testem's adapter reads params.name, so the first stack frame's chunk lands in the tap name).
  2. A throwaway testem config: { ...require('./testem.cjs'), test_page: 'map.html', reporter: 'tap', port: 13144 }
  3. `npx testem ci -f <config> --host 127.0.0.1 > tap2.txt`
Edit S (log location) and W (output dir) below. Writes W2-baseline-tests.tsv (all tests, with
source chunk) and W2-baseline.tsv (per module, only tests whose chunk is under packages/@glimmer*).
"""
import re,collections,sys
S='/private/tmp/claude-501/-Users-edward-hacking-ember-js/bbe5193d-3d3d-4c29-b8e7-d55a518d6dfd/scratchpad'
W='/Users/edward/hacking/ember.js/spec/.work/'
recs=[]
for l in open(S+'/tap2.txt').read().split('\n'):
    if re.match(r'^(ok|not ok|skip) \d+ Chrome ',l): recs.append(l)
    elif recs and not (l.startswith('#') or l.startswith('1..') or l.startswith('npm ') or l==''): recs[-1]+=' '+l.strip()
rows=[]
for l in recs:
    m=re.match(r'^(ok|not ok|skip) \d+ Chrome [\d.]+ - \[\d+ ms\] - (.*) @@(\S*)(?: --- .*)?\s*$',l)
    if not m: print('UNPARSED',l[:200]); continue
    st={'ok':'pass','not ok':'fail','skip':'skip'}[m.group(1)]
    mod,_,name=m.group(2).partition(': ')
    f=re.sub(r'-[A-Za-z0-9_-]{8}\.(js|ts)$','',m.group(3)); f=re.sub(r'^/assets/','',f)
    rows.append((mod,name.replace('\t',' '),st,f))
with open(W+'W2-baseline-tests.tsv','w') as o:
    o.write('module\ttest\tstatus\tsource_chunk\n')
    for r in rows: o.write('\t'.join(r)+'\n')
c=collections.OrderedDict()
for mod,_,st,f in rows:
    if re.match(r'packages/@glimmer(-workspace)?/',f): c.setdefault(mod,collections.Counter())[st]+=1
with open(W+'W2-baseline.tsv','w') as o:
    o.write('module\tpass\tfail\tskip\n')
    for m,k in sorted(c.items()): o.write(f"{m}\t{k['pass']}\t{k['fail']}\t{k['skip']}\n")
tot=collections.Counter()
for k in c.values(): tot+=k
print(len(c),tot,len(rows))
