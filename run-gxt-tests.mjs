/**
 * GXT Test Runner — auto-refresh to prevent OOM
 * Runs tests in a single page, refreshes every ~2000 tests to release memory.
 * Uses QUnit.config.moduleId to skip already-completed modules on refresh.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const filter = process.argv[2] || '';
const BASE_URL = process.env.GXT_URL || 'http://localhost:5180/';
const RESULTS_FILE = './test-results/gxt-failures.json';
const REFRESH_THRESHOLD = 2000; // refresh after this many tests
const MAX_STUCK = 60000; // 60s stuck = move on
const MAX_TOTAL_TIME = 3600000; // 1 hour max

const totalResults = { passed: 0, failed: 0, total: 0, failures: [], moduleStats: {} };
const completedModules = new Set();

async function discoverModules(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const url = filter ? `${BASE_URL}?module=${encodeURIComponent(filter)}` : BASE_URL;
  await page.goto(url, { timeout: 120000, waitUntil: 'commit' });
  await page.waitForFunction(() => typeof QUnit !== 'undefined' && QUnit.config.modules?.length > 50, { timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  const modules = await page.evaluate(() =>
    [...new Set(QUnit.config.modules.map(m => m.name).filter(Boolean))]
  );
  await ctx.close();
  return modules;
}

async function runBatch(browser, moduleNames) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  
  const url = filter ? `${BASE_URL}?module=${encodeURIComponent(filter)}` : BASE_URL;
  await page.goto(url, { timeout: 120000, waitUntil: 'commit' });
  await page.waitForFunction(() => typeof QUnit !== 'undefined', { timeout: 60000 });
  
  // Set up hooks and skip completed modules
  const skippedModuleIds = await page.evaluate((completed) => {
    window.__gxtCollector = { failures: [], moduleStats: {}, completedModules: [] };
    const skipIds = [];
    
    // Find moduleIds for already-completed modules
    for (const mod of QUnit.config.modules) {
      if (completed.includes(mod.name)) {
        skipIds.push(mod.moduleId);
      }
    }
    
    QUnit.testDone((d) => {
      const mod = d.module || 'unknown';
      if (!window.__gxtCollector.moduleStats[mod]) window.__gxtCollector.moduleStats[mod] = { p: 0, f: 0 };
      if (d.failed > 0) {
        window.__gxtCollector.moduleStats[mod].f++;
        if (window.__gxtCollector.failures.length < 5000)
          window.__gxtCollector.failures.push({ m: mod, n: d.name, f: d.failed, p: d.passed });
      } else {
        window.__gxtCollector.moduleStats[mod].p++;
      }
    });
    
    QUnit.moduleDone((d) => {
      if (d.failed === 0 || d.total > 0) {
        window.__gxtCollector.completedModules.push(d.name);
      }
    });
    
    return skipIds;
  }, [...completedModules]);
  
  // Skip completed modules
  if (skippedModuleIds.length > 0) {
    await page.evaluate((ids) => {
      // Remove completed modules from QUnit's queue
      QUnit.config.modules = QUnit.config.modules.filter(m => !ids.includes(m.moduleId));
    }, skippedModuleIds);
  }
  
  // Wait for tests to run
  const start = Date.now();
  let lastTotal = 0, stuckTime = 0;
  
  while (Date.now() - start < 300000) { // 5 min max per batch
    await new Promise(r => setTimeout(r, 5000));
    
    const stats = await page.evaluate(() => ({
      total: QUnit.config.stats?.all || 0,
      failed: QUnit.config.stats?.bad || 0,
      done: window.__qunitResults?.done || false,
    })).catch(() => null);
    
    if (!stats) continue;
    
    const pct = stats.total > 0 ? ((stats.total - stats.failed) / stats.total * 100).toFixed(1) : '0';
    process.stdout.write(`\r  ${stats.total} tests (${pct}% pass)    `);
    
    if (stats.done) break;
    
    // Check if stuck
    if (stats.total === lastTotal) {
      stuckTime += 5000;
      if (stuckTime >= MAX_STUCK) break;
    } else {
      stuckTime = 0;
    }
    lastTotal = stats.total;
    
    // Refresh threshold
    if (stats.total >= REFRESH_THRESHOLD) break;
  }
  
  // Collect results
  const collected = await page.evaluate(() => ({
    stats: QUnit.config.stats,
    collector: window.__gxtCollector,
  })).catch(() => null);
  
  await ctx.close();
  return collected;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  console.log('Discovering modules...');
  const allModules = await discoverModules(browser);
  console.log(`Found ${allModules.length} modules\n`);
  
  const startTime = Date.now();
  let batchNum = 0;
  
  while (Date.now() - startTime < MAX_TOTAL_TIME) {
    batchNum++;
    const remaining = allModules.filter(m => !completedModules.has(m));
    if (remaining.length === 0) break;
    
    console.log(`\n--- Batch ${batchNum} (${remaining.length} modules remaining) ---`);
    
    const result = await runBatch(browser, remaining);
    
    if (!result || !result.stats) {
      console.log('\n  Batch failed (no results)');
      continue;
    }
    
    const batchPassed = (result.stats.all || 0) - (result.stats.bad || 0);
    const batchFailed = result.stats.bad || 0;
    const batchTotal = result.stats.all || 0;
    
    totalResults.passed += batchPassed;
    totalResults.failed += batchFailed;
    totalResults.total += batchTotal;
    
    if (result.collector) {
      totalResults.failures.push(...(result.collector.failures || []));
      for (const mod of (result.collector.completedModules || [])) {
        completedModules.add(mod);
      }
      for (const [mod, stats] of Object.entries(result.collector.moduleStats || {})) {
        if (!totalResults.moduleStats[mod]) totalResults.moduleStats[mod] = { p: 0, f: 0 };
        totalResults.moduleStats[mod].p += stats.p;
        totalResults.moduleStats[mod].f += stats.f;
      }
    }
    
    const cumPct = totalResults.total > 0 ? ((totalResults.passed / totalResults.total) * 100).toFixed(1) : '0';
    console.log(`\n  Batch ${batchNum}: ${batchPassed}/${batchTotal} passed`);
    console.log(`  Cumulative: ${totalResults.passed}/${totalResults.total} (${cumPct}%) | ${completedModules.size} modules done`);
    
    if (batchTotal === 0) {
      console.log('  No tests ran — stopping');
      break;
    }
  }
  
  await browser.close();
  
  // Final results
  const pct = totalResults.total > 0 ? ((totalResults.passed / totalResults.total) * 100).toFixed(1) : '0';
  console.log(`\n=== RESULTS: ${totalResults.passed}/${totalResults.total} passed (${pct}%) ===`);
  
  // Save
  try {
    mkdirSync('./test-results', { recursive: true });
    writeFileSync(RESULTS_FILE, JSON.stringify({
      date: new Date().toISOString(),
      ...totalResults,
      passRate: parseFloat(pct),
    }, null, 2));
    console.log(`Saved to ${RESULTS_FILE}`);
  } catch {}
  
  // Print top failing modules
  const byMod = {};
  for (const f of totalResults.failures) {
    if (!byMod[f.m]) byMod[f.m] = [];
    byMod[f.m].push(f);
  }
  const sorted = Object.entries(byMod).sort((a, b) => b[1].length - a[1].length);
  if (sorted.length > 0) {
    console.log(`\n=== FAILURES BY MODULE (${totalResults.failures.length}) ===\n`);
    for (const [mod, fs] of sorted.slice(0, 20)) {
      console.log(`[${fs.length}] ${mod}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
