/**
 * GXT Test Runner — per-module execution with fresh browser contexts
 * Runs each QUnit module in its own browser context to prevent OOM.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const filter = process.argv[2] || '';
const BASE_URL = process.env.GXT_URL || 'http://localhost:5180/';
const RESULTS_FILE = './test-results/gxt-failures.json';
const MODULES_PER_CTX = 5;

async function discoverModules(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE_URL, { timeout: 120000, waitUntil: 'commit' });
  await page.waitForFunction(() => typeof QUnit !== 'undefined' && QUnit.config.modules?.length > 50, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  const modules = await page.evaluate(() => [...new Set(QUnit.config.modules.map(m => m.name).filter(Boolean))]);
  await ctx.close();
  return modules;
}

async function runModule(page, moduleName) {
  await page.goto(BASE_URL + '?module=' + encodeURIComponent(moduleName), { timeout: 60000, waitUntil: 'commit' });
  try { await page.waitForFunction(() => typeof QUnit !== 'undefined', { timeout: 15000 }); } catch { return { p: 0, f: 0, t: 0, fl: [] }; }
  await page.evaluate(() => {
    window.__r = { fl: [], done: false };
    QUnit.testDone(d => { if (d.failed > 0 && window.__r.fl.length < 100) window.__r.fl.push({ m: d.module, n: d.name, f: d.failed }); });
    QUnit.done(() => { window.__r.done = true; });
  });
  let lastT = 0, stuck = 0;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const s = await page.evaluate(() => ({ t: QUnit.config.stats?.all||0, b: QUnit.config.stats?.bad||0, d: window.__r?.done, fl: window.__r?.fl||[] })).catch(() => null);
    if (!s) continue;
    if (s.d) return { p: s.t - s.b, f: s.b, t: s.t, fl: s.fl };
    if (s.t === lastT) { stuck += 2000; if (stuck >= 30000) return { p: s.t - s.b, f: s.b, t: s.t, fl: s.fl }; } else stuck = 0;
    lastT = s.t;
  }
  const s = await page.evaluate(() => ({ t: QUnit.config.stats?.all||0, b: QUnit.config.stats?.bad||0, fl: window.__r?.fl||[] })).catch(() => ({ t:0, b:0, fl:[] }));
  return { p: s.t - s.b, f: s.b, t: s.t, fl: s.fl };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  console.log('Discovering modules...');
  let mods = await discoverModules(browser);
  if (filter) mods = mods.filter(m => m.toLowerCase().includes(filter.toLowerCase()));
  console.log('Running ' + mods.length + ' modules (' + MODULES_PER_CTX + ' per context)\n');
  const T = { p: 0, f: 0, t: 0, fl: [], ms: {} };
  let ctx = await browser.newContext(), page = await ctx.newPage(), n = 0;
  const t0 = Date.now();
  for (let i = 0; i < mods.length; i++) {
    if (n >= MODULES_PER_CTX) { await ctx.close(); ctx = await browser.newContext(); page = await ctx.newPage(); n = 0; }
    const r = await runModule(page, mods[i]); n++;
    T.p += r.p; T.f += r.f; T.t += r.t; T.fl.push(...r.fl);
    if (r.t > 0) T.ms[mods[i]] = { p: r.p, f: r.f };
    if (r.f > 0) console.log('[' + r.f + '/' + r.t + '] ' + mods[i]);
    if ((i+1) % 50 === 0 || i === mods.length-1) {
      const pct = T.t > 0 ? ((T.p/T.t)*100).toFixed(1) : '0';
      console.log('  --- ' + (i+1) + '/' + mods.length + ' | ' + T.p + '/' + T.t + ' (' + pct + '%) | ' + Math.round((Date.now()-t0)/1000) + 's ---');
    }
  }
  await ctx.close(); await browser.close();
  const pct = T.t > 0 ? ((T.p/T.t)*100).toFixed(1) : '0';
  console.log('\n=== RESULTS: ' + T.p + '/' + T.t + ' passed (' + pct + '%) ===');
  try { mkdirSync('./test-results',{recursive:true}); writeFileSync(RESULTS_FILE, JSON.stringify({date:new Date().toISOString(),...T,passRate:parseFloat(pct)},null,2)); } catch {}
  const byMod = {}; for (const f of T.fl) { if (!byMod[f.m]) byMod[f.m] = []; byMod[f.m].push(f); }
  const sorted = Object.entries(byMod).sort((a,b) => b[1].length - a[1].length);
  if (sorted.length > 0) { console.log('\n=== FAILURES BY MODULE (' + T.fl.length + ') ===\n'); for (const [m,fs] of sorted.slice(0,20)) console.log('[' + fs.length + '] ' + m); }
}
main().catch(e => { console.error(e); process.exit(1); });
