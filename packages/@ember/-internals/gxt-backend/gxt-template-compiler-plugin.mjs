/**
 * Vite plugin: thin wrapper around GXT compiler for Ember template compilation.
 *
 * Responsibilities:
 * 1. Intercepts .gts/.gjs files and delegates to GXT compiler
 * 2. Detects compile()/addTemplate()/template() calls in .ts/.js files,
 *    converts template strings to hbs tagged templates, then delegates to GXT
 * 3. Post-processes GXT output to wrap templates in Ember-compatible factories
 * 4. Fixes missing decorator-transforms imports
 */

import { compiler as gxtCompiler } from '@lifeart/gxt/compiler';
import MagicString from 'magic-string';

const DEBUG_PLUGIN = process.env.GXT_PLUGIN_DEBUG === 'true';

// --- Character classification helpers ---

function isWS(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}
function isIdent(ch) {
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  return (
    (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 95 || c === 36
  );
}
function skipWS(code, i) {
  while (i < code.length && isWS(code[i])) i++;
  return i;
}

// --- String extraction ---

/** Extract a quoted string at `pos` (opening quote). Returns { value, end } or null. */
function extractStr(code, pos) {
  const q = code[pos];
  let val = '',
    i = pos + 1;
  while (i < code.length) {
    if (code[i] === '\\' && i + 1 < code.length) {
      const n = code[i + 1];
      val += n === 'n' ? '\n' : n === '\\' ? '\\' : n;
      i += 2;
      continue;
    }
    if (code[i] === q) return { value: val, end: i + 1 };
    val += code[i];
    i++;
  }
  return null;
}

function isQuote(ch) {
  return ch === "'" || ch === '"' || ch === '`';
}

/** Escape string for backtick template literal. */
function escBT(s) {
  let r = '';
  for (let i = 0; i < s.length; i++) {
    r += s[i] === '`' ? '\\`' : s[i] === '$' ? '\\$' : s[i];
  }
  return r;
}

// --- Brace matching ---

function findClosingBrace(code, openIdx) {
  let d = 1,
    i = openIdx + 1;
  while (i < code.length && d > 0) {
    if (code[i] === '{') d++;
    else if (code[i] === '}') d--;
    i++;
  }
  return d === 0 ? i - 1 : -1;
}

// --- Word-boundary search: find `word` not preceded by ident char ---

function findWord(code, word, from) {
  let i = from;
  while (true) {
    i = code.indexOf(word, i);
    if (i === -1) return -1;
    if (i > 0 && isIdent(code[i - 1])) {
      i += word.length;
      continue;
    }
    return i;
  }
}

// --- Outlet transformation ---

/** Transform {{outlet}} to <ember-outlet /> (string scan, no regex). */
function transformOutlet(code) {
  let r = '',
    i = 0;
  while (i < code.length) {
    if (code[i] === '{' && code[i + 1] === '{') {
      let j = skipWS(code, i + 2);
      if (code.startsWith('outlet', j)) {
        let k = skipWS(code, j + 6);
        if (code[k] === '}' && code[k + 1] === '}') {
          r += '<ember-outlet />';
          i = k + 2;
          continue;
        }
      }
    }
    r += code[i];
    i++;
  }
  return r;
}

function hasOutlet(code) {
  let i = 0;
  while (i < code.length) {
    if (code[i] === '{' && code[i + 1] === '{') {
      let j = skipWS(code, i + 2);
      if (code.startsWith('outlet', j)) {
        let k = skipWS(code, j + 6);
        if (code[k] === '}' && code[k + 1] === '}') return true;
      }
    }
    i++;
  }
  return false;
}

function maybeTransformOutlet(code) {
  return hasOutlet(code) ? transformOutlet(code) : code;
}

// --- dt7948 (decorator-transforms) detection ---

function hasDt7948Ref(code) {
  const i = code.indexOf('dt7948');
  if (i === -1) return false;
  if (i > 0 && isIdent(code[i - 1])) return false;
  const a = code[i + 6];
  return !a || !isIdent(a);
}

function hasDt7948Import(code) {
  return (
    code.includes('from "decorator-transforms/runtime"') ||
    code.includes("from 'decorator-transforms/runtime'") ||
    (code.includes('import') && code.includes('as dt7948') && code.includes('decorator-transforms'))
  );
}

// --- Post-process GXT output ---

function postProcess(code) {
  let r = code;

  // 1. Fix missing decorator-transforms import
  if (hasDt7948Ref(r) && !hasDt7948Import(r)) {
    r = 'import * as dt7948 from "decorator-transforms/runtime";\n' + r;
  }

  // 2. Wrap __gxt_template_N__ declarations in createTemplateFactory()
  const reps = [];
  scanTemplateDecls(r, true, reps); // arrow IIFEs
  scanTemplateDecls(r, false, reps); // plain functions

  for (let i = reps.length - 1; i >= 0; i--) {
    const { start, end, varName, body } = reps[i];
    r =
      r.slice(0, start) +
      `const ${varName} = createTemplateFactory(function() {${body}}, '${varName}');` +
      r.slice(end);
  }

  if (reps.length > 0) {
    r = 'import { createTemplateFactory } from "./compat/gxt-template-factory";\n' + r;
  }

  // 3. Add GXT context imports if needed
  if (r.includes('__gxtCreateRoot') && !r.includes('createRoot as __gxtCreateRoot')) {
    r =
      'import { createRoot as __gxtCreateRoot, setParentContext as __gxtSetParentContext } from "@lifeart/gxt";\n' +
      r;
  }

  // 4. Rewrite direct GXT dist imports to @lifeart/gxt alias
  if (r.includes('gxt.index.es.js')) {
    r = rewriteGxtImports(r);
  }

  return r;
}

/** Scan for const __gxt_template_N__ = (() => { ... })(); or = function() { ... }; */
function scanTemplateDecls(code, isArrow, reps) {
  const PREFIX = 'const __gxt_template_';
  let from = 0;
  while (true) {
    const ci = code.indexOf(PREFIX, from);
    if (ci === -1) break;

    const eq = code.indexOf('=', ci + 6);
    if (eq === -1) {
      from = ci + 1;
      continue;
    }
    const vn = code.slice(ci + 6, eq).trim();
    if (!vn.startsWith('__gxt_template_') || !vn.endsWith('__')) {
      from = ci + 1;
      continue;
    }

    let p = skipWS(code, eq + 1);

    if (isArrow) {
      if (!code.startsWith('(() =>', p)) {
        from = ci + 1;
        continue;
      }
      p = skipWS(code, p + 6);
      if (code[p] !== '{') {
        from = ci + 1;
        continue;
      }
      const bodyEnd = findClosingBrace(code, p);
      if (bodyEnd === -1) {
        from = ci + 1;
        continue;
      }
      // Expect: })();
      let s = skipWS(code, bodyEnd + 1);
      if (code[s] !== ')') {
        from = ci + 1;
        continue;
      }
      s = skipWS(code, s + 1);
      if (code[s] !== '(') {
        from = ci + 1;
        continue;
      }
      s = skipWS(code, s + 1);
      if (code[s] !== ')') {
        from = ci + 1;
        continue;
      }
      s = skipWS(code, s + 1);
      if (code[s] !== ';') {
        from = ci + 1;
        continue;
      }
      s++;
      reps.push({ start: ci, end: s, varName: vn, body: code.slice(p + 1, bodyEnd) });
      from = s;
    } else {
      if (!code.startsWith('function', p)) {
        from = ci + 1;
        continue;
      }
      let f = skipWS(code, p + 8);
      if (code[f] !== '(') {
        from = ci + 1;
        continue;
      }
      f = skipWS(code, f + 1);
      if (code[f] !== ')') {
        from = ci + 1;
        continue;
      }
      f = skipWS(code, f + 1);
      if (code[f] !== '{') {
        from = ci + 1;
        continue;
      }
      const bodyEnd = findClosingBrace(code, f);
      if (bodyEnd === -1) {
        from = ci + 1;
        continue;
      }
      let s = skipWS(code, bodyEnd + 1);
      if (code[s] === ';') s++;
      reps.push({ start: ci, end: s, varName: vn, body: code.slice(f + 1, bodyEnd) });
      from = s;
    }
  }
}

/** Rewrite imports from GXT dist path to @lifeart/gxt alias. */
function rewriteGxtImports(code) {
  const marker = 'gxt.index.es.js';
  let r = '',
    i = 0;
  while (i < code.length) {
    if (code.startsWith('from ', i)) {
      let q = skipWS(code, i + 5);
      const quote = code[q];
      if (quote === '"' || quote === "'") {
        const end = code.indexOf(quote, q + 1);
        if (end !== -1) {
          const path = code.slice(q + 1, end);
          if (path.includes(marker) && path.includes('glimmer-next/dist/')) {
            r += 'from "@lifeart/gxt"';
            i = end + 1;
            continue;
          }
        }
      }
    }
    r += code[i];
    i++;
  }
  return r;
}

// --- Template call finders ---

/** Find funcName('string') calls. Returns array of { start, end, templateString }. */
function findFuncCalls(code, funcName) {
  const results = [];
  let i = 0;
  while (true) {
    i = findWord(code, funcName, i);
    if (i === -1) break;
    let j = skipWS(code, i + funcName.length);
    if (code[j] !== '(') {
      i = j;
      continue;
    }
    j = skipWS(code, j + 1);
    if (!isQuote(code[j])) {
      i = j;
      continue;
    }
    const sr = extractStr(code, j);
    if (!sr) {
      i = j + 1;
      continue;
    }
    let k = skipWS(code, sr.end);
    // Skip optional comma + options object (for compile())
    if (code[k] === ',') {
      k = skipWS(code, k + 1);
      if (code[k] === '{') {
        const be = findClosingBrace(code, k);
        if (be !== -1) k = be + 1;
      }
      k = skipWS(code, k);
    }
    if (code[k] !== ')') {
      i = k;
      continue;
    }
    k++;
    results.push({ start: i, end: k, templateString: sr.value });
    i = k;
  }
  return results;
}

/** Find addTemplate('name', 'template') or addTemplate('name', strip`template`) calls. */
function findAddTemplateCalls(code) {
  const results = [];
  let i = 0;
  while (true) {
    i = findWord(code, 'addTemplate', i);
    if (i === -1) break;
    let j = skipWS(code, i + 11);
    if (code[j] !== '(') {
      i = j;
      continue;
    }
    j = skipWS(code, j + 1);
    // First arg: name string
    if (!isQuote(code[j])) {
      i = j;
      continue;
    }
    const nameR = extractStr(code, j);
    if (!nameR) {
      i = j + 1;
      continue;
    }
    let k = skipWS(code, nameR.end);
    if (code[k] !== ',') {
      i = k;
      continue;
    }
    k = skipWS(code, k + 1);
    // Second arg: string or strip`string`
    let tpl, tplEnd;
    if (code.startsWith('strip', k)) {
      let s = skipWS(code, k + 5);
      if (code[s] === '`') {
        const r = extractStr(code, s);
        if (r) {
          tpl = r.value;
          tplEnd = r.end;
        }
      }
    }
    if (tpl === undefined) {
      if (!isQuote(code[k])) {
        i = k;
        continue;
      }
      const r = extractStr(code, k);
      if (!r) {
        i = k + 1;
        continue;
      }
      tpl = r.value;
      tplEnd = r.end;
    }
    let m = skipWS(code, tplEnd);
    if (code[m] !== ')') {
      i = m;
      continue;
    }
    m++;
    results.push({
      start: i,
      end: m,
      prefix: code.slice(i, nameR.end) + ', ',
      templateString: tpl,
    });
    i = m;
  }
  return results;
}

/** Find { template: 'string' } patterns. */
function findObjTemplates(code) {
  const results = [];
  let i = 0;
  while (true) {
    i = findWord(code, 'template', i);
    if (i === -1) break;
    let j = skipWS(code, i + 8);
    if (code[j] !== ':') {
      i = j;
      continue;
    }
    j = skipWS(code, j + 1);
    if (!isQuote(code[j])) {
      i = j;
      continue;
    }
    const sr = extractStr(code, j);
    if (!sr) {
      i = j + 1;
      continue;
    }
    results.push({ start: i, end: sr.end, templateString: sr.value });
    i = sr.end;
  }
  return results;
}

// --- Detection helpers (quick checks before parsing) ---

function hasCall(code, name) {
  return (findWord(code, name, 0) !== -1 && code.includes(name + '(')) || hasCallSlow(code, name);
}
function hasCallSlow(code, name) {
  let i = 0;
  while (true) {
    i = findWord(code, name, i);
    if (i === -1) return false;
    let j = skipWS(code, i + name.length);
    if (code[j] === '(') return true;
    i = j;
  }
}

function hasTemplateStr(code) {
  let i = 0;
  while (true) {
    i = findWord(code, 'template', i);
    if (i === -1) return false;
    let j = skipWS(code, i + 8);
    if (code[j] === '(' && isQuote(code[j + 1])) return true;
    i = j;
  }
}

function hasObjTemplate(code) {
  let i = 0;
  while (true) {
    i = findWord(code, 'template', i);
    if (i === -1) return false;
    let j = skipWS(code, i + 8);
    if (code[j] === ':') {
      j = skipWS(code, j + 1);
      if (isQuote(code[j])) return true;
    }
    i = j;
  }
}

function hasHbs(code) {
  let i = 0;
  while (true) {
    i = code.indexOf('hbs', i);
    if (i === -1) return false;
    if (i > 0 && (code[i - 1] === '.' || isIdent(code[i - 1]))) {
      i += 3;
      continue;
    }
    const a = code[i + 3];
    if (a === '`' || a === '(') return true;
    i += 3;
  }
}

// --- Import insertion helper ---

function findLastImportEnd(code) {
  let last = 0,
    inML = false,
    pos = 0;
  const lines = code.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('import ') || t.startsWith('import{')) {
      inML = !t.endsWith(';');
      if (t.endsWith(';')) last = pos + line.length;
    } else if (inML) {
      if (t.endsWith(';')) {
        last = pos + line.length;
        inML = false;
      }
    } else if (t.length > 0 && !t.startsWith('//') && !t.startsWith('/*') && !t.startsWith('*')) {
      break;
    }
    pos += line.length + 1;
  }
  return last;
}

// --- Extension replacement ---

function toGtsExt(id) {
  for (const ext of ['.tsx', '.jsx', '.ts', '.js']) {
    if (id.endsWith(ext)) return id.slice(0, -ext.length) + '.gts';
  }
  return id;
}

// --- Unique template ID ---

let _tid = 0;
function nextTid() {
  return `__gxt_template_${_tid++}__`;
}

// ============================================================================
// Main Vite plugin
// ============================================================================

export function gxtTemplateCompilerPlugin(mode, gxtOptions = {}) {
  const gxt = gxtCompiler(mode, {
    flags: {
      IS_GLIMMER_COMPAT_MODE: true,
      WITH_EMBER_INTEGRATION: true,
      WITH_HELPER_MANAGER: true,
      WITH_MODIFIER_MANAGER: true,
      WITH_CONTEXT_API: true,
      TRY_CATCH_ERROR_HANDLING: false,
      ...gxtOptions.flags,
    },
    ...gxtOptions,
  });

  const virtualTemplates = new Map();
  const VP = '\0gxt-template:';

  return {
    name: 'gxt-template-compiler',
    enforce: 'pre',

    config(config, env) {
      const gc = gxt.config ? gxt.config(config, env) : {};
      if (DEBUG_PLUGIN) console.log('[gxt-plugin] config hook called, mode:', env.mode);
      return {
        ...gc,
        resolve: {
          ...gc.resolve,
          extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.gts', '.gjs'],
        },
      };
    },

    resolveId(id) {
      if (id.startsWith(VP)) return id;
      if (virtualTemplates.has(id)) return VP + id;
      return null;
    },

    load(id) {
      if (id.startsWith(VP)) {
        const t = virtualTemplates.get(id.slice(VP.length));
        if (t) return t.source;
      }
      return null;
    },

    async transform(code, id) {
      if (DEBUG_PLUGIN && (id.endsWith('.gts') || id.endsWith('.gjs')))
        console.log('[gxt-plugin] transform called for:', id);

      // Skip node_modules (except @lifeart/gxt), but fix dt7948 if needed
      if (id.includes('node_modules') && !id.includes('@lifeart/gxt')) {
        if (hasDt7948Ref(code) && !hasDt7948Import(code))
          return {
            code: 'import * as dt7948 from "decorator-transforms/runtime";\n' + code,
            map: null,
          };
        return null;
      }

      // Skip certain test/problem directories
      if (
        id.includes('ember-template-compiler/tests') ||
        id.includes('runtime-template-compiler') ||
        id.includes('rendering-test.js')
      )
        return null;

      // --- .gts/.gjs: delegate to GXT, then post-process ---
      if (id.endsWith('.gts') || id.endsWith('.gjs')) {
        if (DEBUG_PLUGIN) console.log('[gxt-plugin] Processing .gts/.gjs file:', id);
        const transformed = maybeTransformOutlet(code);
        try {
          const result = await gxt.transform(transformed, id);
          if (result && result.code) {
            result.code = postProcess(result.code);
            return result;
          }
          if (!result || !result.code) {
            if (DEBUG_PLUGIN) console.log('[gxt-plugin] GXT returned no code');
            return null;
          }
          return result;
        } catch (err) {
          console.error('[gxt-plugin] .gts transform error:', err.message);
          if (DEBUG_PLUGIN) {
            console.error('[gxt-plugin] File:', id);
            console.error('[gxt-plugin] Preview:', transformed.slice(0, 500));
          }
          throw err;
        }
      }

      // --- .ts/.js: check for template patterns ---
      const hC = hasCall(code, 'compile'),
        hAT = hasCall(code, 'addTemplate');
      const hTS = hasTemplateStr(code),
        hOT = hasObjTemplate(code);

      if (!hC && !hAT && !hTS && !hOT) {
        // Still check for hbs tagged templates
        if (hasHbs(code)) {
          const transformed = maybeTransformOutlet(code);
          const tid = id.endsWith('.gts') || id.endsWith('.gjs') ? id : toGtsExt(id);
          const result = await gxt.transform(transformed, tid);
          if (result && result.code) result.code = postProcess(result.code);
          return result;
        }
        return null;
      }

      // --- Transform template string calls to hbs tagged templates ---
      const s = new MagicString(code);
      let changed = false;
      const imports = new Set();

      function addTemplate(tplStr, replaceStart, replaceEnd, wrapFn) {
        let u = maybeTransformOutlet(tplStr);
        const vn = nextTid();
        const replacement = wrapFn ? wrapFn(vn) : vn;
        s.overwrite(replaceStart, replaceEnd, replacement);
        imports.add("import { hbs } from '@lifeart/gxt';");
        imports.add(`const ${vn} = hbs\`${escBT(u)}\`;\n`);
        changed = true;
      }

      for (const c of findFuncCalls(code, 'compile'))
        addTemplate(c.templateString, c.start, c.end, null);

      for (const c of findAddTemplateCalls(code))
        addTemplate(c.templateString, c.start, c.end, (vn) => `${c.prefix}${vn})`);

      for (const c of findFuncCalls(code, 'template'))
        addTemplate(c.templateString, c.start, c.end, null);

      const isTestFile = id.includes('/tests/');
      if (!isTestFile)
        for (const c of findObjTemplates(code))
          addTemplate(c.templateString, c.start, c.end, (vn) => `template: ${vn}`);

      if (!changed) return null;

      // Insert imports after existing imports
      const iStmts = Array.from(imports).filter((x) => x.startsWith('import'));
      const tDefs = Array.from(imports).filter((x) => x.startsWith('const'));
      const iPos = findLastImportEnd(code);
      const ins = '\n' + iStmts.join('\n') + '\n' + tDefs.join('');
      if (iPos > 0) s.appendLeft(iPos, ins);
      else s.prepend(iStmts.join('\n') + '\n' + tDefs.join(''));

      const intermediate = s.toString();

      // Check for problematic template(variable) calls
      if (hasProblematicTemplate(intermediate))
        return { code: intermediate, map: s.generateMap({ hires: true }) };

      // Delegate to GXT for hbs compilation
      const tid = id.endsWith('.gts') || id.endsWith('.gjs') ? id : toGtsExt(id);
      let result;
      try {
        result = await gxt.transform(intermediate, tid);
      } catch (err) {
        console.error(`[gxt-template-compiler] Failed to compile ${id}:`, err.message);
        throw err;
      }

      if (result) {
        if (typeof result === 'string') return { code: postProcess(result), map: null };
        if (result.code) {
          result.code = postProcess(result.code);
          return result;
        }
        return result;
      }
      return { code: intermediate, map: s.generateMap({ hires: true }) };
    },
  };
}

export default gxtTemplateCompilerPlugin;

/** Check for template(identifier) where identifier is a variable, not a string. */
function hasProblematicTemplate(code) {
  let i = 0;
  while (true) {
    i = findWord(code, 'template', i);
    if (i === -1) return false;
    let j = skipWS(code, i + 8);
    if (code[j] !== '(') {
      i = j;
      continue;
    }
    j = skipWS(code, j + 1);
    if (isIdent(code[j]) && !code.startsWith('__gxt_template_', j)) {
      let k = j;
      while (k < code.length && isIdent(code[k])) k++;
      k = skipWS(code, k);
      if (code[k] === ')') return true;
    }
    i = j;
  }
}

// ============================================================================
// Decorator transforms fix plugin (separate post-processing plugin)
// ============================================================================

export function decoratorTransformsFixPlugin() {
  return {
    name: 'decorator-transforms-fix',
    enforce: 'post',
    transform(code, id) {
      if (id.includes('node_modules')) return null;
      if (hasDt7948Ref(code) && !hasDt7948Import(code))
        return {
          code: 'import * as dt7948 from "decorator-transforms/runtime";\n' + code,
          map: null,
        };
      return null;
    },
  };
}
