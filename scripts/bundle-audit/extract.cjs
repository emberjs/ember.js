#!/usr/bin/env node
// Phase 2.5: extract top bundle contributors from rollup-plugin-visualizer
// HTML stats files. Writes top-contributors.json.
const fs = require('fs');
const path = require('path');

function extractData(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  // Find "const data = { ... };" inside the second <script> block.
  const m = html.match(/const data = (\{[\s\S]*?\});\s*\n/);
  if (!m) throw new Error('could not find data in ' + htmlPath);
  return JSON.parse(m[1]);
}

// The visualizer tree: root -> [bundle, ...] -> nested children
// Each leaf has `uid` that maps into `nodeParts` -> { renderedLength, gzipLength, brotliLength }
// Each node has `name` (path segment).
function walkLeaves(tree, nodeParts, nodeMetas, cb, pathSegs = []) {
  if (tree.children && tree.children.length) {
    for (const child of tree.children) {
      walkLeaves(child, nodeParts, nodeMetas, cb, [...pathSegs, child.name]);
    }
  } else if (tree.uid) {
    // Leaf uid is like "abc12345-1" (bundle-specific "moduleParts" key).
    // Meta uid is the prefix before the last "-N". nodeParts is keyed by
    // the full leaf uid; nodeMetas is keyed by the stripped prefix.
    const part = nodeParts[tree.uid];
    const metaUid = part?.metaUid;
    const meta = metaUid ? nodeMetas[metaUid] : undefined;
    cb({
      path: pathSegs.join('/'),
      id: meta?.id || pathSegs.join('/'),
      raw: part?.renderedLength || 0,
      gzip: part?.gzipLength || 0,
      brotli: part?.brotliLength || 0,
    });
  }
}

function collect(htmlPath) {
  const data = extractData(htmlPath);
  const leaves = [];
  walkLeaves(data.tree, data.nodeParts, data.nodeMetas, (leaf) => leaves.push(leaf));
  return leaves;
}

const baseDir = path.resolve(__dirname);
const classicLeaves = collect(path.join(baseDir, 'stats-classic.html'));
const gxtLeaves = collect(path.join(baseDir, 'stats-gxt.html'));

function normalizeId(id) {
  // collapse pnpm store path noise
  return id
    .replace(/^.*\/node_modules\/\.pnpm\/[^/]+\/node_modules\//, 'node_modules/')
    .replace(/^.*\/node_modules\//, 'node_modules/')
    .replace(/^.*\/Repos\/ember\.js\//, '');
}

function bucket(leaves) {
  const byId = new Map();
  for (const leaf of leaves) {
    const key = normalizeId(leaf.id);
    const cur = byId.get(key) || { module: key, raw: 0, gzip: 0, brotli: 0 };
    cur.raw += leaf.raw;
    cur.gzip += leaf.gzip;
    cur.brotli += leaf.brotli;
    byId.set(key, cur);
  }
  return [...byId.values()].sort((a, b) => b.raw - a.raw);
}

const classicBucketed = bucket(classicLeaves);
const gxtBucketed = bucket(gxtLeaves);

const classicMap = new Map(classicBucketed.map((m) => [m.module, m]));
const gxtMap = new Map(gxtBucketed.map((m) => [m.module, m]));

const gxtOnly = gxtBucketed
  .filter((m) => !classicMap.has(m.module))
  .slice(0, 40);

const gxtVsClassicDelta = [];
for (const g of gxtBucketed) {
  const c = classicMap.get(g.module);
  const classicRaw = c ? c.raw : 0;
  const delta = g.raw - classicRaw;
  if (delta > 1000) {
    gxtVsClassicDelta.push({
      module: g.module,
      classic_raw: classicRaw,
      gxt_raw: g.raw,
      delta,
    });
  }
}
gxtVsClassicDelta.sort((a, b) => b.delta - a.delta);

// Bucket by high-level directory to find macro contributors
function macroBucket(leaves) {
  const buckets = new Map();
  for (const leaf of leaves) {
    const id = normalizeId(leaf.id);
    let key = 'other';
    if (id.startsWith('node_modules/@lifeart/gxt/')) key = '@lifeart/gxt';
    else if (id.startsWith('node_modules/@lifeart/')) key = '@lifeart/other';
    else if (id.startsWith('node_modules/')) {
      const m = id.match(/^node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
      key = 'node_modules/' + (m ? m[1] : 'unknown');
    } else if (id.startsWith('packages/@ember/-internals/gxt-backend/')) {
      key = 'packages/@ember/-internals/gxt-backend';
    } else if (id.startsWith('packages/@ember/-internals/')) {
      const m = id.match(/^packages\/@ember\/-internals\/([^/]+)/);
      key = 'packages/@ember/-internals/' + (m ? m[1] : '?');
    } else if (id.startsWith('packages/@ember/')) {
      const m = id.match(/^packages\/(@ember\/[^/]+)/);
      key = 'packages/' + (m ? m[1] : '?');
    } else if (id.startsWith('packages/@glimmer/')) {
      const m = id.match(/^packages\/(@glimmer\/[^/]+)/);
      key = 'packages/' + (m ? m[1] : '?');
    } else if (id.startsWith('packages/ember/')) {
      key = 'packages/ember';
    } else if (id.startsWith('packages/')) {
      const m = id.match(/^packages\/([^/]+)/);
      key = 'packages/' + (m ? m[1] : '?');
    } else if (id.startsWith('broccoli/')) {
      key = 'broccoli';
    }
    const cur = buckets.get(key) || { bucket: key, raw: 0, gzip: 0, brotli: 0, files: 0 };
    cur.raw += leaf.raw;
    cur.gzip += leaf.gzip;
    cur.brotli += leaf.brotli;
    cur.files += 1;
    buckets.set(key, cur);
  }
  return [...buckets.values()].sort((a, b) => b.raw - a.raw);
}

const classicMacro = macroBucket(classicLeaves);
const gxtMacro = macroBucket(gxtLeaves);

const classicMacroMap = new Map(classicMacro.map((b) => [b.bucket, b]));
const macroDelta = gxtMacro.map((g) => {
  const c = classicMacroMap.get(g.bucket) || { raw: 0, gzip: 0, brotli: 0 };
  return {
    bucket: g.bucket,
    classic_raw: c.raw,
    gxt_raw: g.raw,
    delta: g.raw - c.raw,
    gxt_gzip: g.gzip,
    files: g.files,
  };
});
macroDelta.sort((a, b) => b.delta - a.delta);

function totals(leaves) {
  return leaves.reduce(
    (acc, l) => ({
      raw: acc.raw + l.raw,
      gzip: acc.gzip + l.gzip,
      brotli: acc.brotli + l.brotli,
    }),
    { raw: 0, gzip: 0, brotli: 0 }
  );
}

const out = {
  classic_total: totals(classicLeaves),
  gxt_total: totals(gxtLeaves),
  classic_top_20: classicBucketed.slice(0, 20),
  gxt_top_20: gxtBucketed.slice(0, 20),
  gxt_only: gxtOnly,
  gxt_vs_classic_delta_top_40: gxtVsClassicDelta.slice(0, 40),
  macro_buckets_classic_top_20: classicMacro.slice(0, 20),
  macro_buckets_gxt_top_20: gxtMacro.slice(0, 20),
  macro_delta_top_20: macroDelta.slice(0, 20),
};

fs.writeFileSync(
  path.join(baseDir, 'top-contributors.json'),
  JSON.stringify(out, null, 2)
);

console.log('wrote top-contributors.json');
console.log('classic total:', out.classic_total);
console.log('gxt total:', out.gxt_total);
console.log('\n=== MACRO DELTA (top 15) ===');
for (const b of macroDelta.slice(0, 15)) {
  const kb = (n) => (n / 1024).toFixed(1) + 'K';
  console.log(
    `${kb(b.delta).padStart(9)}  ${kb(b.classic_raw).padStart(9)} -> ${kb(b.gxt_raw).padStart(9)}  ${b.bucket}`
  );
}
console.log('\n=== GXT-ONLY MODULES (top 20) ===');
for (const m of gxtOnly.slice(0, 20)) {
  const kb = (n) => (n / 1024).toFixed(1) + 'K';
  console.log(`${kb(m.raw).padStart(9)}  ${m.module}`);
}
console.log('\n=== GXT vs CLASSIC PER-MODULE DELTA (top 20) ===');
for (const m of gxtVsClassicDelta.slice(0, 20)) {
  const kb = (n) => (n / 1024).toFixed(1) + 'K';
  console.log(
    `${kb(m.delta).padStart(9)}  ${kb(m.classic_raw).padStart(9)} -> ${kb(m.gxt_raw).padStart(9)}  ${m.module}`
  );
}
