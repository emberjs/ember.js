/**
 * GXT Ember-dialect AST transforms (extracted from `compile.ts`, Phase 3).
 *
 * These are the `@glimmer/syntax`-style visitors applied to the parsed template
 * AST inside the GXT runtime compiler (via the public `transforms` CompileOptions
 * hook), after preprocess and before glimmer-next codegen — the same shape classic
 * Ember AST plugins use. They replace the brittle string/regex template-source
 * pre-rewrites that preceded them. The whole self-contained block (the `GxtAstEnv`
 * shape, the ~14 visitors + their local helpers/constants, and the
 * `buildGxtDialectTransforms` assembler) lived in `compile.ts`; it is moved here
 * verbatim to shrink that file. The module is a LEAF — it imports nothing from
 * `compile.ts`; `compile.ts` imports `buildGxtDialectTransforms`,
 * `GxtAssertFindings`, and `lookupGxtComment` back from here.
 *
 * Seam: `gxtHtmlCommentTransform` writes the HTML-comment registry; the
 * `__gxtCommentLookup` builtin resolver in `compile.ts` reads it back at render
 * time via the exported `lookupGxtComment`.
 */
import { assert as emberAssert } from '@ember/debug';
// Public AST-transform hook type. `transforms: AstTransform[]` runs
// `@glimmer/syntax`-style visitors on the parsed template AST after preprocess,
// before glimmer-next codegen.
// @ts-ignore - type-only; some published versions lack this export (see compile.ts footer note)
import { type AstTransform as GxtAstTransform } from '@lifeart/gxt/runtime-compiler';

// The `{{on}}` → `{{on-ext}}` rewrite contract: `gxtOnModifierTransform` (below)
// rewrites `{{on …}}` to this modifier name, and compile.ts registers the same
// name as an alias for the `on` modifier (`_ensureOnExtAlias`). Shared here as the
// single source of truth; the hyphen guarantees no collision with user modifiers.
export const _GXT_ON_EXT_ALIAS = 'on-ext';

// ── HTML-comment registry seam ────────────────────────────────────────────
// `gxtHtmlCommentTransform` (below) registers each `<!-- ... -->` body under a
// unique plain-ASCII token and emits `(__gxtCommentLookup "<token>")`; the
// `__gxtCommentLookup` resolver in compile.ts reads it back at render time via
// `lookupGxtComment` (so curly-brace-containing comment bodies never go through
// the GXT parser). The counter monotonically increments so each token is unique
// within the process.
const _gxtCommentRegistry: Record<string, string> = Object.create(null);
let _gxtCommentCounter = 0;

/** Resolve a registry token back to its literal HTML-comment source (or ''). */
export function lookupGxtComment(token: unknown): string {
  const key = typeof token === 'string' ? token : String(token ?? '');
  return _gxtCommentRegistry[key] || '';
}

/**
 * Counter for unique `-with-dynamic-vars` scope variable names. Shared across
 * all templates in a single process — GXT's `{{#let}}` block generates block
 * params that are local anyway, so uniqueness is just a convenience to avoid
 * hash collisions within a single template (nested `-with-dynamic-vars`).
 */
let _dynVarCounter = 0;

/**
 * Ember dialect AST transforms.
 *
 * These run inside the GXT runtime compiler via the public `transforms`
 * `CompileOptions` hook — `@glimmer/syntax`-style visitors applied to the
 * parsed template AST *after* preprocess and *before* glimmer-next codegen
 * (the same shape classic Ember AST plugins use). They are wired into the
 * `gxtCompileTemplate(...)` call in `compileTemplate` below.
 *
 * Each transform here REPLACES a former brittle string/regex pre-rewrite of
 * the template *source text*. Operating on the AST is exact: it cannot be
 * fooled by the same token appearing inside a string-literal attribute value,
 * inside an HTML comment, as a substring of a longer identifier, etc. — the
 * hand-rolled tokenizers the string versions needed (whitespace skipping,
 * identifier-boundary checks, comment/raw-block skipping) are all subsumed by
 * the parser.
 *
 * The `env.syntax.builders` factory shape (`ASTPluginBuilder`) is used so we
 * construct replacement nodes with glimmer-next's own `@glimmer/syntax`
 * builders (no direct `@glimmer/syntax` dependency in this package).
 */

// `env` shape passed to an ASTPluginBuilder by the GXT compiler:
//   { meta: { moduleName }, syntax: { parse, builders, print, traverse, Walker } }
// We only type the bits we touch.
interface GxtAstEnv {
  syntax: {
    builders: {
      element(
        tag: string,
        options?: { attrs?: unknown[]; children?: unknown[]; selfClosing?: boolean }
      ): unknown;
      path(original: string): unknown;
      block(
        path: unknown,
        params: unknown[],
        hash: unknown,
        program: unknown,
        inverse?: unknown,
        loc?: unknown
      ): unknown;
      // Additional `@glimmer/syntax` builders used by the dialect transforms.
      mustache(path: unknown, params?: unknown[], hash?: unknown, trusting?: boolean): unknown;
      sexpr(path: unknown, params?: unknown[], hash?: unknown): unknown;
      hash(pairs?: unknown[]): unknown;
      pair(key: string, value: unknown): unknown;
      string(value: string): unknown;
      blockItself(body?: unknown[], params?: Array<unknown | string>, chained?: boolean): unknown;
      elementModifier(path: unknown, params?: unknown[], hash?: unknown, loc?: unknown): unknown;
      attr(name: string, value: unknown, loc?: unknown): unknown;
      text(chars?: string, loc?: unknown): unknown;
    };
  };
}

/**
 * `{{outlet}}` → `<ember-outlet />`.
 *
 * Mirrors the build-time transform in
 * packages/demo/compat/gxt-template-compiler-plugin.mjs so that templates
 * compiled at runtime (via `compile()` / `precompileTemplate()` from
 * addTemplate(), rendering test helpers, etc.) get the same handling as
 * templates compiled at build time. Without it, the GXT compiler treats
 * `{{outlet}}` like `{{yield}}` (a default-slot yield) and no `<ember-outlet>`
 * element is produced — which breaks nested route rendering.
 *
 * Only the bare zero-arg/zero-hash form is lowered, exactly matching the old
 * string scanner. Named outlets (`{{outlet "main"}}`) keep their mustache form
 * (they carry a positional param) and are handled downstream.
 */
function gxtOutletTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-outlet',
    visitor: {
      MustacheStatement(node: any): unknown {
        const path = node.path;
        if (
          path &&
          path.type === 'PathExpression' &&
          path.head &&
          path.head.type === 'VarHead' &&
          path.head.name === 'outlet' &&
          node.params.length === 0 &&
          node.hash.pairs.length === 0
        ) {
          return b.element('ember-outlet', { attrs: [], children: [], selfClosing: true });
        }
        return undefined;
      },
    },
  };
}

/**
 * `{{#@argName args}}body{{/@argName}}` → `{{#component @argName args}}body{{/component}}`.
 *
 * GXT's AST compiler may not emit code for a block whose head is an `@arg`
 * (AtHead detection returns empty). Rewriting it to a `{{#component @arg}}`
 * block routes it through the component path, which GXT handles. The AST form
 * naturally preserves positional params, the hash, the main block, AND any
 * `{{else}}` inverse — the former regex captured everything up to the first
 * `{{/@…}}` as opaque body text and could not split an inverse.
 */
function gxtBlockAtArgTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-block-at-arg',
    visitor: {
      BlockStatement(node: any): unknown {
        const path = node.path;
        if (path && path.type === 'PathExpression' && path.head && path.head.type === 'AtHead') {
          const componentPath = b.path('component');
          const argRef = b.path(path.head.name);
          return b.block(
            componentPath,
            [argRef, ...node.params],
            node.hash,
            node.program,
            node.inverse,
            node.loc
          );
        }
        return undefined;
      },
    },
  };
}

// Built-in names that must NOT be wrapped as a SubExpression inside a quoted
// attribute value (they are keywords / built-in helpers GXT resolves itself).
// Mirrors the BUILTINS set in the former `transformAttrQuotedHelperMustaches`
// string scanner exactly.
const _GXT_ATTR_QUOTED_HELPER_BUILTINS: ReadonlySet<string> = new Set([
  'this',
  'else',
  'if',
  'unless',
  'each',
  'each-in',
  'let',
  'with',
  'yield',
  'outlet',
  'component',
  'helper',
  'modifier',
  'debugger',
  'log',
  'action',
  'concat',
  'hash',
  'array',
  'fn',
  'get',
  'mut',
  'readonly',
  'unbound',
  'unique-id',
  'in-element',
  'has-block',
  'has-block-params',
  'on',
]);
// Same bare-identifier shape the string scanner accepted (a single, dot-free
// identifier — leading letter/underscore, then letters/digits/underscore/dash).
const _GXT_ATTR_BARE_IDENT_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * Bare-identifier helper mustaches inside quoted HTML attribute values:
 *   `attr="{{foo-bar}}"`            → `attr="{{(foo-bar)}}"`
 *   `attr="pre-{{foo-bar}}-post"`   → `attr="pre-{{(foo-bar)}}-post"`
 *   `attr="{{null}}"` / `{{undefined}}` → `attr="{{""}}"`
 *
 * GXT's compiler swallows a bare `{{foo-bar}}` in a quoted attribute value
 * (it resolves it as a PathExpression against an empty scope and emits
 * `[""].join("")`). Wrapping it as a SubExpression forces the helper
 * resolution path. Literal `null`/`undefined` are mapped to an empty string
 * literal (Ember treats them as empty in attribute position).
 *
 * Replaces the former `transformAttrQuotedHelperMustaches` string scanner.
 * Operating on `AttrNode` values means we cannot be fooled by `{{...}}`
 * appearing in body/text position or inside an element's modifier list — the
 * parser already classified those as something other than an attribute value.
 * The same name guards apply: skip `this.x`, `@arg`, dotted paths, mustaches
 * carrying params/hash, and the built-in keyword set above.
 *
 * IMPORTANT: only QUOTED values are rewritten. The parser represents a quoted
 * attribute value as a `ConcatStatement` (even when it is a single mustache),
 * and an UNQUOTED `={{x}}` as a bare `MustacheStatement`. The string scanner
 * matched only `="{{…}}"`, so we restrict to `ConcatStatement` parts and leave
 * bare mustache values alone (rewriting them would invoke a by-reference
 * helper in named-argument position).
 */
function gxtAttrQuotedHelperTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  function rewriteMustache(node: any): unknown {
    const p = node.path;
    if (!p) return undefined;
    // Only zero-arg, zero-hash mustaches (matching the string scanner, which
    // rejected anything containing whitespace/parens/`=` inside the braces).
    if (node.params.length !== 0 || node.hash.pairs.length !== 0) return undefined;
    // `{{null}}` / `{{undefined}}` parse as literal heads (not PathExpressions).
    if (p.type === 'NullLiteral' || p.type === 'UndefinedLiteral') {
      return b.mustache(b.string(''));
    }
    if (p.type !== 'PathExpression') return undefined;
    // Bare, single-part var head only (no `this`, no `@arg`, no dotted path).
    if (p.head && p.head.type === 'VarHead' && p.tail.length === 0) {
      const name: string = p.head.name;
      if (!_GXT_ATTR_BARE_IDENT_RE.test(name)) return undefined;
      if (_GXT_ATTR_QUOTED_HELPER_BUILTINS.has(name)) return undefined;
      return b.mustache(b.sexpr(b.path(name)));
    }
    return undefined;
  }
  return {
    name: 'ember-gxt-attr-quoted-helper',
    visitor: {
      AttrNode(node: any): void {
        const v = node.value;
        if (!v) return;
        // ONLY rewrite QUOTED attribute values. A quoted value always parses as
        // a `ConcatStatement` (even a single mustache: `="{{x}}"` →
        // `Concat[Mustache]`, and `="pre-{{x}}-post"` → `Concat[Text, Mustache,
        // Text]`). An UNQUOTED `={{x}}` parses as a bare `MustacheStatement`.
        // The former string scanner matched only `="{{…}}"` (literal quotes),
        // so the bare-mustache case must NOT be wrapped — doing so would invoke
        // a helper that Ember passes by reference in named-argument position
        // (e.g. `<Bar @content={{foo}} />` where `foo` is a local helper).
        if (v.type === 'ConcatStatement') {
          for (let i = 0; i < v.parts.length; i++) {
            const part = v.parts[i];
            if (part && part.type === 'MustacheStatement') {
              const r = rewriteMustache(part);
              if (r) v.parts[i] = r;
            }
          }
        }
      },
    },
  };
}

/**
 * `{{#each-in EXPR as |KEY VALUE|}}BODY{{else}}ELSE{{/each-in}}` →
 * `{{#each (gxtEntriesOf EXPR) key="@identity" as |__ei__|}}
 *    {{#let __ei__.k __ei__.v as |KEY VALUE|}}BODY{{/let}}
 *  {{else}}ELSE{{/each}}`
 *
 * (and the one-param / zero-param variants). `gxtEntriesOf` returns
 * `[{k, v}, ...]` for objects, Maps, proxies, and custom iterables; the
 * `key="@identity"` keeps row identity stable.
 *
 * Replaces the former `transformEachInBlocks` string scanner. Recursion over
 * the AST handles nesting and `{{else}}`-splitting for free (the string
 * version hand-rolled an innermost-first loop + same-depth `{{else}}` finder).
 *
 * NOTE: the `gxtEntriesOf` binding must be added to the compile `bindings` set
 * so the compiler emits a bare binding reference rather than a string lookup;
 * the call site does this whenever the source contains `{{#each-in`.
 */
function gxtEachInTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-each-in',
    visitor: {
      BlockStatement(node: any): unknown {
        const p = node.path;
        if (
          !(
            p &&
            p.type === 'PathExpression' &&
            p.head &&
            p.head.type === 'VarHead' &&
            p.head.name === 'each-in' &&
            p.tail.length === 0
          )
        ) {
          return undefined;
        }
        const expr = node.params[0];
        if (!expr) return undefined;
        const entriesOf = b.sexpr(b.path('gxtEntriesOf'), [expr]);
        const keyHash = b.hash([b.pair('key', b.string('@identity'))]);
        const bp: string[] = node.program.blockParams || [];
        if (bp.length >= 1) {
          const entryVar = '__ei__';
          const letParams: unknown[] = [b.path(entryVar + '.k')];
          const letBP: string[] = [bp[0]!];
          if (bp.length >= 2) {
            letParams.push(b.path(entryVar + '.v'));
            letBP.push(bp[1]!);
          }
          const letBlock = b.blockItself(node.program.body, letBP);
          const letStmt = b.block(b.path('let'), letParams, b.hash([]), letBlock);
          const eachProgram = b.blockItself([letStmt], [entryVar]);
          return b.block(b.path('each'), [entriesOf], keyHash, eachProgram, node.inverse, node.loc);
        }
        // No block params — emit `{{#each (gxtEntriesOf EXPR) key="@identity"}}`.
        const eachProgram = b.blockItself(node.program.body, []);
        return b.block(b.path('each'), [entriesOf], keyHash, eachProgram, node.inverse, node.loc);
      },
    },
  };
}

/**
 * `{{#-with-dynamic-vars outletState=EXPR}}BODY{{/-with-dynamic-vars}}` →
 * `{{#let EXPR as |__gxt_dvar_outletState_N__|}}BODY'{{/let}}` and
 * `{{-get-dynamic-var "outletState"}}` / `(-get-dynamic-var "outletState")` →
 * the nearest enclosing scope var (inside such a block) or the
 * `gxtGetOutletState` built-in helper (at top level).
 *
 * Semantics (mirrors Ember stock behavior — replaces the former
 * `transformDynamicVars` string scanner + its `_findInnermostWithDynamicVars` /
 * `_parseDynamicVarsArgs` / `_rewriteGetOutletInBody` helpers):
 *   - Only `outletState` is a valid key. Any other key on a
 *     `{{#-with-dynamic-vars}}` block fires an `Ember.assert` with the
 *     `-with-dynamic-scope` message; any other key on a `-get-dynamic-var` call
 *     fires one with the `-get-dynamic-scope` message. These asserts are what
 *     the `expectAssertion` tests in `with-dynamic-var-test.js` rely on. Because
 *     these visitors run in **ember's** process (the `transforms` hook is
 *     applied inside `gxtCompileTemplate`), `emberAssert` resolves to the same
 *     swappable debug function the string version used — so `expectAssertion`'s
 *     stub captures the message exactly as before.
 *   - `{{#-with-dynamic-vars outletState=EXPR}}BODY{{/-with-dynamic-vars}}`
 *     lowers to `{{#let EXPR as |VAR|}}BODY'{{/let}}` (GXT accepts `{{#let}}`),
 *     where BODY' has inner `{{-get-dynamic-var "outletState"}}` rewritten to the
 *     generated `VAR`. A `-with-dynamic-vars` block with NO `outletState` key
 *     lowers to BODY' directly (no `{{#let}}` wrapper), exactly as the string
 *     version did.
 *   - A top-level (out-of-scope) or non-`outletState` `-get-dynamic-var` lowers
 *     to the `gxtGetOutletState` built-in helper call (mustache form
 *     `{{(gxtGetOutletState)}}`, subexpression form `(gxtGetOutletState)`),
 *     which reads `globalThis.__currentOutletState`.
 *
 * Scope discipline: the generated `VAR` must be in scope for the block's BODY
 * but NOT for the `outletState=EXPR` head itself (a `-get-dynamic-var` inside the
 * head resolves to `gxtGetOutletState`, matching the string version, which fed
 * the head expr through its top-level phase). `@glimmer/syntax`'s `traverse`
 * visits a `BlockStatement`'s `hash` (the head) BEFORE descending into its
 * program `Block`, so we push the scope var on the program `Block`'s enter and
 * pop it on exit — the head is already visited by then. Nesting is handled by
 * the scope stack (nearest binding wins); generated names come from the module
 * `_dynVarCounter` (same counter the string version used). For nested blocks the
 * counter is allocated outermost-first here (string version allocated
 * innermost-first), so the `__gxt_dvar_outletState_N__` suffixes can differ for
 * nested blocks — but they are purely-internal `{{#let}}` block-param names and
 * the binding↔reference renaming stays consistent (alpha-equivalent output).
 *
 * Operating on the AST is exact: it cannot be fooled by the keyword appearing
 * inside a string literal / comment, and the innermost-first scan + same-depth
 * matching the string version hand-rolled fall out of `traverse` for free.
 */
function gxtDynamicVarsTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  // Names currently in lexical scope (bodies of enclosing `-with-dynamic-vars`).
  // Pushed on the program `Block`'s enter, popped on its exit.
  const scopeStack: string[] = [];
  // Whether each `Block` enter pushed a scope var (popped 1:1 on `Block` exit).
  const blockPushes: boolean[] = [];
  // Open `-with-dynamic-vars` blocks (between their `BlockStatement` enter/exit).
  const pendingStack: Array<{ node: any; varName: string; outletNode: any }> = [];

  const isWithDynamicVars = (node: any): boolean =>
    node.path &&
    node.path.type === 'PathExpression' &&
    node.path.head &&
    node.path.head.type === 'VarHead' &&
    node.path.head.name === '-with-dynamic-vars' &&
    node.path.tail.length === 0;

  const isGetDynamicVar = (path: any): boolean =>
    path &&
    path.type === 'PathExpression' &&
    path.head &&
    path.head.type === 'VarHead' &&
    path.head.name === '-get-dynamic-var' &&
    path.tail.length === 0;

  // Extract the single literal-string key of a `-get-dynamic-var` call. The
  // string version matched ONLY `-get-dynamic-var "KEY"` immediately followed by
  // the closing marker — i.e. exactly one positional param (a string literal)
  // and no hash. Anything else (dynamic key, extra params/hash) was left alone.
  const literalGetKey = (node: any): string | null => {
    if (node.params.length !== 1 || node.hash.pairs.length !== 0) return null;
    const p0 = node.params[0];
    return p0 && p0.type === 'StringLiteral' ? p0.value : null;
  };

  const getOutletStateCall = (): unknown => b.sexpr(b.path('gxtGetOutletState'));

  return {
    name: 'ember-gxt-dynamic-vars',
    visitor: {
      BlockStatement: {
        enter(node: any): void {
          if (!isWithDynamicVars(node)) return;
          // Validate keys — only `outletState` is permitted (Phase-1 assert).
          for (const pair of node.hash.pairs) {
            if (pair.key !== 'outletState') {
              emberAssert(
                `Using \`-with-dynamic-scope\` is only supported for \`outletState\` (you used \`${pair.key}\`).`,
                false
              );
            }
          }
          const outletPair = node.hash.pairs.find((p: any) => p.key === 'outletState');
          const varName = `__gxt_dvar_outletState_${_dynVarCounter++}__`;
          pendingStack.push({ node, varName, outletNode: outletPair ? outletPair.value : null });
        },
        exit(node: any): unknown {
          if (!isWithDynamicVars(node)) return undefined;
          const frame = pendingStack.pop()!;
          if (frame.outletNode) {
            // `{{#let EXPR as |VAR|}}BODY'{{/let}}` — BODY' already has its inner
            // `outletState` gets rewritten to `VAR` (done during child traversal).
            const letBlock = b.blockItself(node.program.body, [frame.varName]);
            return b.block(
              b.path('let'),
              [frame.outletNode],
              b.hash([]),
              letBlock,
              node.inverse,
              node.loc
            );
          }
          // No `outletState` — splice the (rewritten) body in place of the block.
          return node.program.body;
        },
      },
      Block: {
        enter(node: any, path: any): void {
          const parent = path && path.parent && path.parent.node;
          const top = pendingStack[pendingStack.length - 1];
          if (parent && top && parent === top.node && parent.program === node) {
            scopeStack.push(top.varName);
            blockPushes.push(true);
          } else {
            blockPushes.push(false);
          }
        },
        exit(): void {
          if (blockPushes.pop()) scopeStack.pop();
        },
      },
      MustacheStatement(node: any): unknown {
        if (!isGetDynamicVar(node.path)) return undefined;
        const key = literalGetKey(node);
        if (key === null) return undefined;
        if (key === 'outletState') {
          return scopeStack.length > 0
            ? b.mustache(b.path(scopeStack[scopeStack.length - 1]!))
            : b.mustache(getOutletStateCall());
        }
        // Non-`outletState` get (Phase-2 assert), then lower to the helper.
        emberAssert(
          `Using \`-get-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`,
          false
        );
        return b.mustache(getOutletStateCall());
      },
      SubExpression(node: any): unknown {
        if (!isGetDynamicVar(node.path)) return undefined;
        const key = literalGetKey(node);
        if (key === null) return undefined;
        if (key === 'outletState') {
          return scopeStack.length > 0
            ? b.path(scopeStack[scopeStack.length - 1]!)
            : getOutletStateCall();
        }
        emberAssert(
          `Using \`-get-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`,
          false
        );
        return getOutletStateCall();
      },
    },
  };
}

/**
 * `{{on ...}}` element modifier → `{{on-ext ...}}`.
 *
 * Upstream GXT's AST compiler short-circuits the literal `on` modifier and
 * drops the hash pairs (`once=` / `capture=` / `passive=`) AND skips the
 * Glimmer VM `OnModifierManager`'s rebind-on-callback-change semantics. The
 * `on-ext` alias (registered in `$_MANAGERS.modifier._builtinModifiers` by
 * `_ensureOnExtAlias`) routes through GXT's general modifier path, preserving
 * both. Even hash-less `{{on "evt" cb}}` is routed so the rebind semantics
 * the Ember `{{on}}` counter assertions expect fire.
 *
 * Replaces the former `transformOnModifierHashArgs` string scanner. Targeting
 * `ElementModifierStatement` is strictly more precise than the string match on
 * `{{on `: it only fires in modifier position (the sole valid use of `{{on}}`),
 * never on an `{{on}}` substring inside a string literal or comment.
 *
 * GATED: skipped when the template's strict-mode scope shadows `on` with a
 * non-canonical modifier — the call site omits this transform in that case so
 * the user's binding takes effect (`keyword modifier: on :: can be shadowed`).
 */
function gxtOnModifierTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-on-ext',
    visitor: {
      ElementModifierStatement(node: any): unknown {
        const p = node.path;
        if (
          p &&
          p.type === 'PathExpression' &&
          p.head &&
          p.head.type === 'VarHead' &&
          p.head.name === 'on' &&
          p.tail.length === 0
        ) {
          return b.elementModifier(b.path(_GXT_ON_EXT_ALIAS), node.params, node.hash, node.loc);
        }
        return undefined;
      },
    },
  };
}

// Bare kebab-case identifier shape accepted in BODY position (a lowercase
// leading segment, then one-or-more `-segment` parts). Mirrors the
// `KEBAB_IDENT_RE` in the former `transformBodyBareHelperMustaches` string
// scanner exactly.
const _GXT_BODY_KEBAB_IDENT_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;
// Kebab names that are GXT/Ember built-in keywords (resolved by the compiler
// itself) and must NOT be lowered to a component element. Mirrors the BUILTINS
// set in the former string scanner exactly.
const _GXT_BODY_BARE_BUILTINS: ReadonlySet<string> = new Set([
  'each-in',
  'in-element',
  'has-block',
  'has-block-params',
  'unique-id',
]);

/**
 * Zero-arg bare kebab-case mustaches in BODY position:
 *   `{{my-component}}` → `<MyComponent />`
 *
 * GXT's compiler emits `$_maybeHelper("my-component", [], this)` for a bare
 * `{{my-component}}` in content position; if the name resolves to a component
 * its rendered DOM is silently dropped into the text-children slot. Lowering it
 * to a `<MyComponent />` element routes it through GXT's tag-rewrite path (which
 * checks BOTH the helper and component registries — correct for either kind).
 * The with-args case (`{{my-component data=…}}`) is already angle-bracket-lowered
 * by GXT's own `transformCurlyArgsToAngleBracket`; this fills the zero-args gap.
 *
 * Replaces the former `transformBodyBareHelperMustaches` string scanner. Working
 * on the AST makes the position-awareness the scanner hand-rolled (the
 * `inOpenTag` flag, the `="…"` quoted-attr skip, the `<!-- -->` comment skip,
 * the `{{{…}}}` triple-stache skip, the block/inverse `#`/`/` skip) fall out of
 * the node classification for free:
 *   - element modifiers (`<h1 {{foo-bar}}>`) parse as `ElementModifierStatement`,
 *     never visited by this `MustacheStatement` handler;
 *   - quoted attr values parse as `ConcatStatement` parts, unquoted attr values
 *     and named args parse with an `AttrNode` / `HashPair` parent — all excluded
 *     by the body-position parent guard below;
 *   - HTML comments are `CommentStatement` nodes (their text is never re-parsed);
 *   - triple-stache `{{{…}}}` carries `escaped === false`;
 *   - `{{#x}}` / `{{/x}}` / `{{else}}` are `BlockStatement`s, not mustaches.
 *
 * The same name guards apply: skip dotted paths, `this.x`, `@arg`, mustaches
 * carrying params/hash, non-kebab names, the built-in keyword set, and (when
 * `scopeValues` binds the name) explicitly scope-bound kebab locals — those keep
 * their `{{name}}` form so GXT resolves them through its scope-lookup path
 * (rehydration delegate fixtures, strict-mode locals).
 */
function gxtBodyBareHelperTransform(scopeValues?: Record<string, unknown>) {
  const hasScope = !!scopeValues && Object.keys(scopeValues).length > 0;
  return (env: GxtAstEnv) => {
    const b = env.syntax.builders;
    return {
      name: 'ember-gxt-body-bare-helper',
      visitor: {
        MustacheStatement(node: any, path: any): unknown {
          const p = node.path;
          if (!p || p.type !== 'PathExpression') return undefined;
          // Zero-arg, zero-hash only (the string scanner rejected any inner
          // whitespace/parens/pipes/quotes/`=`).
          if (node.params.length !== 0 || node.hash.pairs.length !== 0) return undefined;
          // Bare single-part var head only (no `this`, no `@arg`, no dotted path).
          if (!p.head || p.head.type !== 'VarHead' || p.tail.length !== 0) return undefined;
          // Triple-stache `{{{…}}}` outputs raw HTML — not a component invocation.
          if (node.escaped === false) return undefined;
          const name: string = p.head.name;
          if (!_GXT_BODY_KEBAB_IDENT_RE.test(name)) return undefined;
          if (_GXT_BODY_BARE_BUILTINS.has(name)) return undefined;
          if (hasScope && Object.prototype.hasOwnProperty.call(scopeValues!, name)) {
            return undefined;
          }
          // BODY position only. The string scanner lowered a mustache only when
          // it was NOT inside an HTML open tag / quoted attr value / comment; in
          // the AST that means its parent is a Template, Block, or ElementNode
          // (the content slots). A `ConcatStatement` (quoted attr), `AttrNode`
          // (unquoted attr value), or `HashPair` (named arg) parent is an
          // attribute/argument context and must be left alone.
          const parent = path && path.parent && path.parent.node;
          if (parent) {
            const pt = parent.type;
            if (pt !== 'Template' && pt !== 'Block' && pt !== 'ElementNode') {
              return undefined;
            }
          }
          // `{{my-component}}` → `<MyComponent />`. `customizeComponentName` at
          // the call site lowers the PascalCase tag back to kebab for the Ember
          // registry lookup during codegen — identical to a parsed `<MyComponent />`.
          const pascal = name
            .split('-')
            .map((seg) => (seg.length === 0 ? '' : seg[0]!.toUpperCase() + seg.slice(1)))
            .join('');
          const el: any = b.element(pascal, { attrs: [], children: [], selfClosing: true });
          // The `element` builder ignores its `selfClosing` option (it always
          // emits a close tag). Force the self-closing shape so codegen emits the
          // empty-default-props form (`$_edp`) byte-identically to a parsed
          // `<MyComponent />`, rather than a default-block component
          // (`@__hasBlock__="default"`).
          el.selfClosing = true;
          el.closeTag = null;
          return el;
        },
      },
    };
  };
}

// Tag-name shapes the former `transformBlockParamsInTemplate` string scanner
// matched (its `tagPattern` first capture group): a PascalCase tag (possibly
// dotted/dashed) OR a kebab-case tag (a dash-containing lowercase name). The AST
// transform fires the `$_bp` rewrite ONLY for these tags so it affects exactly
// the same elements — dynamic tags (`<this.Foo …>`, `<@foo …>`) and bare
// lowercase tags were left to glimmer-next's native block-param handling by the
// string version, and stay native here (their block params still SHADOW, see the
// scope stack, but are not rewritten).
const _GXT_BP_PASCAL_TAG_RE = /^[A-Z][a-zA-Z0-9.-]*$/;
const _GXT_BP_KEBAB_TAG_RE = /^[a-z][a-z0-9]*-[a-z0-9-]*$/;
function _gxtBpTagMatches(tag: string): boolean {
  return _GXT_BP_PASCAL_TAG_RE.test(tag) || _GXT_BP_KEBAB_TAG_RE.test(tag);
}

/**
 * Angle-bracket component block params:
 *   `<Foo as |x y|>{{x}} {{y.prop}}</Foo>`
 *     → `<Foo @__hasBlockParams__="default">{{this.$_bp0}} {{this.$_bp1.prop}}</Foo>`
 *   `<Foo as |x|><x.Trigger .../></Foo>` → `<Foo …><this.$_bp0.Trigger .../></Foo>`
 *
 * `$_bp{N}` is a pure ember-runtime convention: ember installs `$_bp{i}` getters
 * (see `Object.defineProperty(globalThis, '$_bp'+i, …)` ~9263/9301) that return
 * the current yielded block-param at render time; glimmer-next compiles
 * `this.$_bp0` as an ordinary `this`-path. The marker arg
 * `@__hasBlockParams__="default"` tells the slot machinery the component declared
 * a default block with params (consumed at ~10439 / ~11482).
 *
 * Replaces the former `transformBlockParamsInTemplate` string scanner. Operating
 * on the AST adds SHADOW-AWARENESS the string version lacked: it scope-stacks
 * every block-param binder (element AND `{{#block as |..|}}`), so an inner binder
 * re-declaring a name correctly shadows the outer component param — the string
 * version blind-replaced every `{{name}}` in the component's text span, even
 * inside a nested `{{#each items as |name|}}` (where the name is a native
 * glimmer-next block param, not a `$_bp`). Only ELEMENT-binder references resolve
 * to `$_bp`; block-statement binders shadow without rewriting (glimmer-next owns
 * those natively).
 *
 * Faithfulness: for non-shadowing templates the emitted JS is byte-identical to
 * the string version, EXCEPT a dotted block-param tail (`{{x.prop}}`) emits
 * `this.$_bp0.prop` rather than the string version's `this.$_bp0?.prop`. The
 * `?.` was an artifact of injecting `this.$_bp0.prop` as literal SOURCE (the
 * compiler's loc-based parts add `?.` for ≥3 segments); glimmer-next's own value
 * serializer explicitly SUPPRESSES `?.` for `$_`-prefixed paths
 * (`if (e.includes("$_")) return e`), so the AST output is the intended shape.
 * The two are semantically equivalent except when a block param is nullish and a
 * property is read off it.
 *
 * The PathExpression head rewrite MUTATES the parsed node in place (head → `this`,
 * prepend `$_bp{N}` to the tail) rather than building a fresh node, so the
 * node's `loc` (and thus codegen) stays consistent with a parsed `this`-path.
 */
function gxtBlockParamsTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  // Scope stack of frames; each frame is an array of { name, bp? }. A `bp`
  // (e.g. `$_bp0`) marks an ELEMENT block-param (rewrite refs to `this.$_bp{N}`);
  // a bp-less entry is a shadowing-only binder (a `{{#block as |..|}}` param, or
  // a native element param whose tag didn't match the string-rewrite shape).
  const scopes: Array<Array<{ name: string; bp?: string }>> = [];
  const resolve = (name: string): { name: string; bp?: string } | null => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const hit = scopes[i]!.find((e) => e.name === name);
      if (hit) return hit; // nearest binder wins
    }
    return null;
  };
  // Rewrite a yielded contextual-component tag `<param.Foo …>` → `<this.$_bp0.Foo …>`
  // (only when `param` is an in-scope ELEMENT binder). Resolved against the
  // ENCLOSING scope (called before this element pushes its own params).
  const rewriteTag = (node: any): void => {
    const tag: string = node.tag;
    if (!tag) return;
    const dot = tag.indexOf('.');
    if (dot === -1) return;
    const head = tag.slice(0, dot);
    const hit = resolve(head);
    if (!hit || hit.bp === undefined) return;
    node.tag = `this.${hit.bp}.${tag.slice(dot + 1)}`;
  };
  return {
    name: 'ember-gxt-block-params',
    visitor: {
      ElementNode: {
        enter(node: any): void {
          rewriteTag(node);
          const bp: string[] = node.blockParams || [];
          if (bp.length && _gxtBpTagMatches(node.tag)) {
            scopes.push(bp.map((n, i) => ({ name: n, bp: `$_bp${i}` })));
            node.attributes.push(b.attr('@__hasBlockParams__', b.text('default')));
            node.__gxtBpRewrite = true;
          } else if (bp.length) {
            // Native (dynamic/bare) tag with block params — left to glimmer-next,
            // but its params still shadow outer element params.
            scopes.push(bp.map((n) => ({ name: n })));
          } else {
            scopes.push([]);
          }
        },
        exit(node: any): void {
          scopes.pop();
          if (node.__gxtBpRewrite) {
            node.blockParams = [];
            delete node.__gxtBpRewrite;
          }
        },
      },
      // `{{#each items as |item|}}` / `{{#let … as |x|}}` etc. — the program /
      // inverse `Block` carries the binder. These shadow but are NEVER rewritten
      // (glimmer-next resolves them as native block params).
      Block: {
        enter(node: any): void {
          const bp: string[] = node.blockParams || [];
          scopes.push(bp.length ? bp.map((n) => ({ name: n })) : []);
        },
        exit(): void {
          scopes.pop();
        },
      },
      PathExpression(node: any): void {
        if (!node.head || node.head.type !== 'VarHead') return;
        const hit = resolve(node.head.name);
        if (!hit || hit.bp === undefined) return;
        // Mutate in place (preserve `loc`): head → `this`, prepend `$_bp{N}`.
        node.head = (b.path('this') as any).head;
        node.tail = [hit.bp, ...(node.tail || [])];
        if (typeof node.original === 'string') {
          node.original = `this.${(node.tail as string[]).join('.')}`;
        }
      },
    },
  };
}

// Rawtext (RCDATA/RAWTEXT) element tags: their content is parsed as plain text
// by the browser tokenizer, so a `<EmberHtmlRaw …>` child would serialize as
// literal markup. Mirrors the `rawtextTags` list in the former
// `transformTripleMustaches` string scanner.
const _GXT_RAWTEXT_TAGS: ReadonlySet<string> = new Set(['title', 'script', 'style', 'textarea']);

/**
 * Build the `@value` expression node a triple-mustache lowers to. Mirrors the
 * former string scanner's paren-wrap rule: a bare path / single positional ref
 * (`{{{this.html}}}`, `{{{@x}}}`) becomes `{{this.html}}` (the mustache path
 * alone); a helper invocation with params/hash (`{{{foo bar}}}`) becomes
 * `{{(foo bar)}}` (the path wrapped as a SubExpression). The string version
 * keyed this off "inner contains whitespace"; on the AST it keys off the parsed
 * params/hash, which is the exact same distinction for every realistic input.
 */
function _gxtTripleValueExpr(b: GxtAstEnv['syntax']['builders'], node: any): unknown {
  if (node.params.length === 0 && node.hash.pairs.length === 0) {
    return b.mustache(node.path);
  }
  return b.mustache(b.sexpr(node.path, node.params, node.hash));
}

/**
 * Triple-mustache `{{{expr}}}` → `<EmberHtmlRaw @value={{expr}} />`.
 *
 * The GXT compiler treats `{{{expr}}}` identically to `{{expr}}` (escaped text
 * interpolation — see the `escaped !== false` codegen), but Ember semantics
 * require inserting the value as raw HTML. Wrapping it in an `<EmberHtmlRaw>`
 * element routes it through the special-cased `resolvedTag === 'EmberHtmlRaw'`
 * codegen + the ember-gxt-wrappers render path, which parses the value into DOM
 * nodes and reactively updates via `innerHTML`. ONLY detection moves to the AST;
 * the runtime mechanism in ember-gxt-wrappers is untouched.
 *
 * NOTE (2026-07-04): gxt >=0.0.80 (#256 flag + #261 reactivity fix) can lower a
 * content `{{{expr}}}` to native `$_html(() => expr, this)`, retiring this
 * content-position lowering + the compile.ts EmberHtmlRaw block. Re-attempted on
 * 0.0.80: gaps 2/3 (absent-path + null-proto reactivity) are now FIXED (trusted
 * suite 149/149), but GAP 1 still blocks — `{{{this.field}}}` at the root of a
 * classic `@ember/component` layout renders EMPTY (classic-component
 * native-layout ↔ `$_html`-carrier mount seam; see the `EMBER_TRUSTED_HTML` note
 * in compile.ts's flags block). Until that mount is fixed this transform keeps
 * emitting `<EmberHtmlRaw>` for content triples.
 *
 * Replaces the former `transformTripleMustaches` string scanner. A
 * triple-mustache parses as a `MustacheStatement` with `escaped === false`, so
 * detection is a single flag check — the hand-rolled tokenizer the string
 * version needed to skip `{{! }}` / `{{!-- --}}` comments (now
 * `MustacheCommentStatement`s, never `escaped===false`), `{{{{raw}}}}` handlebars
 * raw blocks, and `}}}` boundary disambiguation are all subsumed by the parser.
 *
 * Rawtext fallback: inside a `<title>` / `<script>` / `<style>` / `<textarea>`
 * the browser parses content as plain text, so a `<EmberHtmlRaw>` element child
 * would serialize as literal `&lt;EmberHtmlRaw…&gt;` garbage. There the string
 * version emitted a plain `{{expr}}` interpolation instead; we reproduce that by
 * walking the ancestor chain for an enclosing rawtext `ElementNode`.
 */
function gxtTripleMustacheTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-triple-mustache',
    visitor: {
      MustacheStatement(node: any, path: any): unknown {
        if (node.escaped !== false) return undefined;
        // CONTENT position only. In ATTRIBUTE position (`<div style={{{x}}}>`)
        // emit an empty value — no trusted-attribute channel, and a real binding
        // would fire the style-XSS warning for a value the user trusted (guards
        // the `style={{{this.userValue}}}` no-warning test).
        const parent = path && path.parent && path.parent.node;
        const pt = parent && parent.type;
        if (pt && pt !== 'Template' && pt !== 'Block' && pt !== 'ElementNode') {
          return b.text('');
        }
        // Rawtext fallback: nearest enclosing rawtext element → plain `{{expr}}`.
        let p = path && path.parent;
        let inRawtext = false;
        while (p) {
          const an = p.node;
          if (
            an &&
            an.type === 'ElementNode' &&
            _GXT_RAWTEXT_TAGS.has(String(an.tag).toLowerCase())
          ) {
            inRawtext = true;
            break;
          }
          p = p.parent;
        }
        if (inRawtext) return _gxtTripleValueExpr(b, node);
        const el: any = b.element('EmberHtmlRaw', {
          attrs: [b.attr('@value', _gxtTripleValueExpr(b, node))],
          children: [],
          selfClosing: true,
        });
        // The `element` builder always emits a close tag; force the self-closing
        // shape so codegen matches a parsed `<EmberHtmlRaw … />` byte-for-byte.
        el.selfClosing = true;
        el.closeTag = null;
        return el;
      },
    },
  };
}

/**
 * Preserve HTML comments: `<!-- ... -->` → `<EmberHtmlRaw @value={{(__gxtCommentLookup "<token>")}} />`.
 *
 * The upstream GXT compiler strips `<!-- ... -->` from the emitted template;
 * Ember classic templates treat them as first-class DOM nodes (rehydration and
 * `assertHTML` tests assert on them verbatim). Each comment is registered in the
 * module-local `_gxtCommentRegistry` under a stable plain-ASCII token, and the
 * emitted `<EmberHtmlRaw>` calls the `__gxtCommentLookup` built-in (resolved at
 * render time) to recover the literal comment source — `__gxtCommentLookup` +
 * `_gxtCommentRegistry` + the `<!---->` / `<!--/htmlRaw-->` marker stripping in
 * snapshot.ts are all UNTOUCHED; only detection moves to the AST.
 *
 * Replaces the former `_preserveHtmlComments` string scanner. An HTML comment
 * parses as a `CommentStatement` whose `value` is the inner text (without the
 * `<!--` / `-->` delimiters), so we reconstruct the full source as
 * `'<!--' + value + '-->'` — exactly what the string scanner captured via
 * `template.slice(i, end + 3)`. Handlebars comments `{{! ... }}` /
 * `{{!-- ... --}}` parse as `MustacheCommentStatement` (a DIFFERENT node kind,
 * never visited here), so they are left to be stripped, matching Ember.
 *
 * The token registry indirection is still required: a comment body may contain
 * `{{...}}`, and feeding that back through the parser as an attribute value would
 * mis-parse it as a mustache — the token is pure ASCII and survives intact.
 * (Faithfulness proven by byte-diffing emitted code, normalizing the
 * monotonic token suffix `__gxtCmt_<N>`, which is an internal counter whose exact
 * value the writer and the `__gxtCommentLookup` reader agree on either way.)
 */
function gxtHtmlCommentTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-html-comment',
    visitor: {
      CommentStatement(node: any): unknown {
        const full = '<!--' + node.value + '-->';
        const token = `__gxtCmt_${++_gxtCommentCounter}`;
        _gxtCommentRegistry[token] = full;
        const value = b.mustache(b.sexpr(b.path('__gxtCommentLookup'), [b.string(token)]));
        const el: any = b.element('EmberHtmlRaw', {
          attrs: [b.attr('@value', value)],
          children: [],
          selfClosing: true,
        });
        el.selfClosing = true;
        el.closeTag = null;
        return el;
      },
    },
  };
}

// Table-section element tags whose presence as a `<table>`'s first significant
// child suppresses the implicit-`<tbody>` wrap (HTML allows these directly).
// Mirrors the tag set the former `transformTableTbody` string scanner checked.
const _GXT_TABLE_SECTION_TAGS: ReadonlySet<string> = new Set([
  'thead',
  'tbody',
  'tfoot',
  'caption',
  'colgroup',
]);

// First child of a `<table>` that is not a whitespace-only `TextNode` — mirrors
// the string scanner's `inner.replace(/^\s+/, '')` leading-whitespace strip.
function _gxtFirstSignificantChild(children: any[]): any {
  for (const c of children) {
    if (c && c.type === 'TextNode') {
      if (c.chars && c.chars.trim() !== '') return c;
      continue;
    }
    return c;
  }
  return null;
}

// Whether any descendant element is a `<tr…>` — the AST analogue of the string
// scanner's `inner.includes('<tr')` (which also peers inside `{{#block}}` bodies,
// so we recurse into `BlockStatement` program/inverse bodies too).
function _gxtHasTrDescendant(nodes: any[]): boolean {
  for (const c of nodes) {
    if (!c) continue;
    if (c.type === 'ElementNode') {
      if (String(c.tag).toLowerCase().startsWith('tr')) return true;
      if (_gxtHasTrDescendant(c.children)) return true;
    } else if (c.type === 'BlockStatement') {
      if (c.program && _gxtHasTrDescendant(c.program.body)) return true;
      if (c.inverse && _gxtHasTrDescendant(c.inverse.body)) return true;
    }
  }
  return false;
}

/**
 * Insert the implicit `<tbody>` an HTML parser auto-inserts when `<tr>` appears
 * directly inside `<table>`. The browser tokenizer fixes this up when parsing
 * HTML strings (`innerHTML` / DOMParser), but the GXT AST compiler emits a raw
 * `$_tag('table', …, [$_tag('tr', …)])`. Rehydration / `assertHTML` tests
 * compare serialized DOM against an innerHTML-parsed expected string, which
 * always carries the `<tbody>`.
 *
 * Replaces the former `transformTableTbody` string scanner, reproducing its
 * exact decision on the parsed AST:
 *   - process only the OUTERMOST `<table>` (the string scanner depth-matched the
 *     closing `</table>` and skipped the whole span, so a NESTED table kept its
 *     raw `<tr>`); a `tableDepth` counter reproduces that — only `tableDepth===0`
 *     tables are eligible, sibling top-level tables are each processed;
 *   - skip when the first significant child is a `<thead>`/`<tbody>`/`<tfoot>`/
 *     `<caption>`/`<colgroup>` (a present section wrapper) OR a mustache / block /
 *     handlebars-comment (the scanner's `trimmed.startsWith('{{')` guard — it
 *     could not see into dynamic content, so it bailed). A leading HTML comment
 *     or text node does NOT suppress the wrap (the scanner's `<\s*\w+` regex did
 *     not match `<!--`), matching the scanner;
 *   - otherwise, when a `<tr>` descendant exists, wrap the ENTIRE child list in a
 *     single `<tbody>` (the scanner wrapped all of `inner`, leading whitespace /
 *     blocks included), leaving the original nodes in place inside it.
 *
 * Operating on the AST removes two scanner bugs (proven by byte-diff: every
 * realistic + documented edge case matches; these two cases the scanner turned
 * into hard compile errors): a `>` inside a `<table>` attribute value (e.g.
 * `data-x="a>b"`) no longer splits the opening tag at the wrong offset, and a
 * `<tr` substring inside an attribute value can no longer mis-trigger the wrap.
 */
function gxtTableTbodyTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  let tableDepth = 0;
  return {
    name: 'ember-gxt-table-tbody',
    visitor: {
      ElementNode: {
        enter(node: any): void {
          if (String(node.tag).toLowerCase() !== 'table') return;
          const outermost = tableDepth === 0;
          tableDepth++;
          if (!outermost) return; // nested table — string scanner skipped these
          const fs = _gxtFirstSignificantChild(node.children);
          let isWrapper = false;
          if (fs) {
            if (fs.type === 'ElementNode') {
              if (_GXT_TABLE_SECTION_TAGS.has(String(fs.tag).toLowerCase())) {
                isWrapper = true;
              }
            } else if (
              fs.type === 'MustacheStatement' ||
              fs.type === 'BlockStatement' ||
              fs.type === 'MustacheCommentStatement'
            ) {
              // `trimmed.startsWith('{{')` in the string scanner.
              isWrapper = true;
            }
          }
          if (isWrapper) return;
          if (!_gxtHasTrDescendant(node.children)) return;
          const tbody: any = b.element('tbody', {
            attrs: [],
            children: node.children.slice(),
            selfClosing: false,
          });
          node.children = [tbody];
        },
        exit(node: any): void {
          if (String(node.tag).toLowerCase() === 'table') tableDepth--;
        },
      },
    },
  };
}

/**
 * Build the ordered list of Ember dialect AST transforms for one compile.
 *
 * `gxtOutletTransform`, `gxtBlockAtArgTransform`, `gxtAttrQuotedHelperTransform`,
 * `gxtEachInTransform`, `gxtDynamicVarsTransform`, `gxtBlockParamsTransform` and
 * `gxtBodyBareHelperTransform` are always active (they target disjoint node kinds
 * — or, for the `MustacheStatement` visitors, disjoint name/shape predicates — so
 * order between them is irrelevant). The `{{on}}`→`{{on-ext}}` transform is
 * appended only when the strict-mode scope does NOT shadow `on` — mirroring the
 * per-compile gate the former string rewrite used at its call site.
 *
 * `gxtTableTbodyTransform`, `gxtTripleMustacheTransform` and
 * `gxtHtmlCommentTransform` (the former template-SOURCE string rewrites, now the
 * last to migrate) are prepended FIRST, in that relative order — mirroring the
 * old call-site order where they ran on the source before any AST transform.
 * The order between tbody and triple is LOAD-BEARING: the tbody visitor's
 * "first significant child is `{{…}}` → skip wrap" rule must see a leading
 * triple-mustache as a raw `MustacheStatement`, so tbody must run before the
 * triple visitor rewrites it into an `<EmberHtmlRaw>` element (glimmer applies
 * each transform as a separate full traverse, so array order is observable).
 */
// Every builder the dialect visitors call (the full `GxtAstEnv` surface). If
// an upstream @lifeart/gxt release changes its compiler's AST/builders shape,
// the visitors would otherwise fail silently or emit wrong code — this list
// backs the once-per-process fail-loud assertion below.
const GXT_REQUIRED_BUILDERS = [
  'element',
  'path',
  'block',
  'mustache',
  'sexpr',
  'hash',
  'pair',
  'string',
  'blockItself',
  'elementModifier',
  'attr',
  'text',
] as const;

let _gxtAstEnvShapeChecked = false;

/**
 * Fail-loud guard on the upstream `CompileOptions.transforms` contract: the
 * first time the GXT compiler invokes a dialect transform builder, assert the
 * `env.syntax.builders` factory exposes every method the 11 visitors use.
 * Runs once per process at builder-call time (NOT as its own transform pass),
 * so it adds zero AST traversals and zero per-compile cost after the first.
 */
function assertGxtAstEnvShape(env: GxtAstEnv): void {
  if (_gxtAstEnvShapeChecked) return;
  _gxtAstEnvShapeChecked = true;
  const builders = (env as { syntax?: { builders?: Record<string, unknown> } })?.syntax?.builders;
  const missing = builders
    ? GXT_REQUIRED_BUILDERS.filter((name) => typeof builders[name] !== 'function')
    : [...GXT_REQUIRED_BUILDERS];
  if (missing.length > 0) {
    throw new Error(
      `[gxt-backend] @lifeart/gxt AST-transform contract violation: ` +
        `env.syntax.builders is missing ${missing.join(', ')}. The installed ` +
        `@lifeart/gxt compiler's AST shape has drifted from what the Ember ` +
        `dialect transforms (buildGxtDialectTransforms) were written against — ` +
        `check the @lifeart/gxt version pin before debugging template output.`
    );
  }
}

/**
 * True when `node` is the "dynamic string" argument shape the `(helper)` /
 * `(modifier)` keyword string scanners (`hasDynamicHelper` / `hasDynamicModifier`)
 * flagged: a `this.<seg>` path (≥1 tail segment, i.e. NOT bare `this`) or an
 * `@<...>` arg path. Mirrors the scanners' `this.` / `@` branch exactly.
 */
function _isDynamicKeywordArg(node: any): boolean {
  if (!node || node.type !== 'PathExpression' || !node.head) return false;
  if (node.head.type === 'AtHead') return true;
  if (node.head.type === 'ThisHead') return Array.isArray(node.tail) && node.tail.length >= 1;
  return false;
}

/**
 * Ember-dialect assert findings, populated by the read-only assert VISITORS
 * during the GXT compile traverse and acted on by `precompileTemplate` AFTER the
 * compile call. The visitors must NOT assert/throw inline: the GXT compiler
 * swallows any exception raised inside a transform into its `errors[]` array,
 * and `precompileTemplate` does not re-throw those — so an inline throw would be
 * silently dropped (it would never reach `assert.throws` / abort compilation).
 * Detecting in the visitor (AST-exact, replacing the former source scanners) but
 * firing the assert/throw from `precompileTemplate` preserves the original
 * control flow (propagating throw, real compile abort) exactly.
 */
export interface GxtAssertFindings {
  textArea: boolean;
  dynamicHelper: boolean;
  dynamicModifier: boolean;
  // First offending `{{head.tail}}` (matches the former scanner, which threw on
  // the first match in document order).
  dottedMustache: { head: string; tail: string } | null;
}

/**
 * `<TextArea ... />` typo detector (the user meant `<Textarea />`). Read-only
 * visitor replacing the `hasTextAreaTag` source scanner. `ElementNode.tag` is
 * the exact parsed tag name, so `<TextAreaExtra>` / `<Textarea>` / a bare
 * `TextArea` text node never false-trigger (the cases the scanner's char-
 * boundary checks hand-rolled). Records into `findings`; `precompileTemplate`
 * fires the `getDebugFunction('assert')` assert.
 */
function gxtTextAreaTypoAssert(findings: GxtAssertFindings) {
  return function (_env: GxtAstEnv) {
    return {
      name: 'ember-gxt-assert-textarea',
      visitor: {
        ElementNode(node: any): void {
          if (node.tag === 'TextArea') findings.textArea = true;
        },
      },
    };
  };
}

// Head / tail-segment character classes the former `findDottedMustaches` source
// scanner enforced: head was `[a-z][a-zA-Z0-9]*` (NO `_`/`-`), the tail started
// with a letter and each segment was alphanumeric. The `gxtDottedMustacheAssert`
// visitor re-checks these against the parsed path so it fires on EXACTLY the
// `{{foo.bar}}` shapes the scanner matched (not the broader set glimmer admits
// as a path, e.g. `{{foo_bar.x}}` / `{{foo.0}}`, which the scanner skipped).
const _DOTTED_MUSTACHE_HEAD_RE = /^[a-z][a-zA-Z0-9]*$/;
const _DOTTED_MUSTACHE_TAIL_SEG_RE = /^[a-zA-Z0-9]+$/;

/**
 * `{{foo.bar}}` where `foo` is a free (lowercase-headed) variable not brought
 * into scope by a block param or a strict-mode binding. Read-only visitor
 * replacing the `findDottedMustaches` source scanner. Matches the scanner's
 * shape: a bare `MustacheStatement` (no params, no hash) whose path head is a
 * `[a-z][a-zA-Z0-9]*` `VarHead` with ≥1 alphanumeric, letter-initial tail
 * segment. `this.x` (`ThisHead`) and PascalCase heads are skipped, as the
 * scanner skipped them; the head/tail char-class guards keep parity with the
 * scanner on the `_`/`-`/leading-digit shapes it never matched. The block-param
 * / scope-binding sets are computed once by the caller (see `findBlockParamNames`)
 * and threaded in, matching the former call site. Records the FIRST offender
 * into `findings`; `precompileTemplate` throws the `not in scope` error.
 */
function gxtDottedMustacheAssert(
  findings: GxtAssertFindings,
  scopeValueNames: Set<string> | null,
  blockParamNames: Set<string>
) {
  return function (_env: GxtAstEnv) {
    return {
      name: 'ember-gxt-assert-dotted-mustache',
      visitor: {
        MustacheStatement(node: any): void {
          if (findings.dottedMustache) return; // first offender only (scanner threw on first)
          const path = node.path;
          if (
            !path ||
            path.type !== 'PathExpression' ||
            !path.head ||
            path.head.type !== 'VarHead' ||
            !Array.isArray(path.tail) ||
            path.tail.length === 0 ||
            node.params.length !== 0 ||
            node.hash.pairs.length !== 0
          )
            return;
          const head = String(path.head.name);
          if (!_DOTTED_MUSTACHE_HEAD_RE.test(head)) return; // scanner head was [a-z][a-zA-Z0-9]*
          const tailSegs = path.tail as string[];
          // Scanner required the tail to start with a letter and every segment to
          // be alphanumeric (its tail char-class was [a-zA-Z][a-zA-Z0-9.]*).
          const first = tailSegs[0] || '';
          const fc = first.charCodeAt(0);
          if (!((fc >= 65 && fc <= 90) || (fc >= 97 && fc <= 122))) return;
          for (const seg of tailSegs) {
            if (!_DOTTED_MUSTACHE_TAIL_SEG_RE.test(seg)) return;
          }
          if (blockParamNames.has(head)) return;
          if (scopeValueNames && scopeValueNames.has(head)) return;
          findings.dottedMustache = { head, tail: tailSegs.join('.') };
        },
      },
    };
  };
}

/**
 * `{{helper this.x}}` / `{{helper @x}}` (a single dynamic-string positional arg,
 * no hash). Read-only visitor replacing the `hasDynamicHelper` source scanner,
 * which matched ONLY the top-level mustache form `{{helper …}}` with a single
 * `this.`/`@` arg immediately before the closing `}}`. Records into `findings`;
 * `precompileTemplate` fires the assert.
 */
function gxtDynamicHelperAssert(findings: GxtAssertFindings) {
  return function (_env: GxtAstEnv) {
    return {
      name: 'ember-gxt-assert-dynamic-helper',
      visitor: {
        MustacheStatement(node: any): void {
          const path = node.path;
          if (
            path &&
            path.type === 'PathExpression' &&
            path.head &&
            path.head.type === 'VarHead' &&
            path.head.name === 'helper' &&
            path.tail.length === 0 &&
            node.params.length === 1 &&
            node.hash.pairs.length === 0 &&
            _isDynamicKeywordArg(node.params[0])
          ) {
            findings.dynamicHelper = true;
          }
        },
      },
    };
  };
}

/**
 * `(modifier this.x)` / `(modifier @x)` (a single dynamic-string positional arg,
 * no hash). Read-only visitor replacing the `hasDynamicModifier` source scanner,
 * which matched ONLY the subexpression form `(modifier …)` with a single
 * `this.`/`@` arg immediately before the closing `)`. Records into `findings`;
 * `precompileTemplate` fires the assert.
 */
function gxtDynamicModifierAssert(findings: GxtAssertFindings) {
  return function (_env: GxtAstEnv) {
    return {
      name: 'ember-gxt-assert-dynamic-modifier',
      visitor: {
        SubExpression(node: any): void {
          const path = node.path;
          if (
            path &&
            path.type === 'PathExpression' &&
            path.head &&
            path.head.type === 'VarHead' &&
            path.head.name === 'modifier' &&
            path.tail.length === 0 &&
            node.params.length === 1 &&
            node.hash.pairs.length === 0 &&
            _isDynamicKeywordArg(node.params[0])
          ) {
            findings.dynamicModifier = true;
          }
        },
      },
    };
  };
}

export function buildGxtDialectTransforms(
  includeOnExt: boolean,
  scopeValues?: Record<string, unknown>,
  blockParamNames?: Set<string>,
  assertFindings?: GxtAssertFindings
): readonly GxtAstTransform[] {
  // Read-only Ember-dialect ASSERT-DETECTION visitors, PREPENDED so they run on
  // the parsed AST in raw, pre-rewrite form — exactly the source text the former
  // string scanners ran on — and in their original relative priority order
  // (textarea → dotted-mustache → dynamic-helper → dynamic-modifier). They only
  // RECORD into `assertFindings`; `precompileTemplate` fires the asserts/throws
  // AFTER the compile call (the GXT compiler swallows transform-internal throws
  // into errors[], which precompileTemplate does not re-throw — see
  // GxtAssertFindings). These visitors never touch `env.syntax.builders`, so
  // running before the tbody env-shape guard is safe; the guard still fires on
  // the first builder-using transform (tbody) below.
  //
  // NOTE: `findDottedTags` (the `<foo.bar>` tag-not-in-scope assert) and the
  // `{{attrs.x}}` / `{{this.attrs.x}}` location-bearing asserts are intentionally
  // NOT ported — `findDottedTags`'s tested "requires whitespace after the tail"
  // quirk and the attrs asserts' source-offset `(L:C)` location string can't be
  // reproduced from the normalized AST without re-inspecting source, so they stay
  // pre-compile string asserts in `precompileTemplate`.
  const scopeValueNames = scopeValues ? new Set(Object.keys(scopeValues)) : null;
  const bpNames = blockParamNames || new Set<string>();
  const findings: GxtAssertFindings = assertFindings || {
    textArea: false,
    dynamicHelper: false,
    dynamicModifier: false,
    dottedMustache: null,
  };
  const transforms: GxtAstTransform[] = [
    gxtTextAreaTypoAssert(findings) as unknown as GxtAstTransform,
    gxtDottedMustacheAssert(findings, scopeValueNames, bpNames) as unknown as GxtAstTransform,
    gxtDynamicHelperAssert(findings) as unknown as GxtAstTransform,
    gxtDynamicModifierAssert(findings) as unknown as GxtAstTransform,
    // The tbody builder is wrapped with the once-per-process env-shape guard
    // (see assertGxtAstEnvShape). It is the FIRST builder-using transform (the
    // assert-detection visitors above are read-only and touch no builders), and
    // the tbody↔triple order is load-bearing (see the doc comment above), so
    // wrapping it guards every later builder-using visitor too.
    ((env: GxtAstEnv) => {
      assertGxtAstEnvShape(env);
      return gxtTableTbodyTransform(env);
    }) as unknown as GxtAstTransform,
    gxtTripleMustacheTransform as unknown as GxtAstTransform,
    gxtHtmlCommentTransform as unknown as GxtAstTransform,
    gxtOutletTransform as unknown as GxtAstTransform,
    gxtBlockAtArgTransform as unknown as GxtAstTransform,
    gxtAttrQuotedHelperTransform as unknown as GxtAstTransform,
    gxtEachInTransform as unknown as GxtAstTransform,
    gxtDynamicVarsTransform as unknown as GxtAstTransform,
    gxtBlockParamsTransform as unknown as GxtAstTransform,
    gxtBodyBareHelperTransform(scopeValues) as unknown as GxtAstTransform,
  ];
  if (includeOnExt) {
    transforms.push(gxtOnModifierTransform as unknown as GxtAstTransform);
  }
  return transforms;
}
