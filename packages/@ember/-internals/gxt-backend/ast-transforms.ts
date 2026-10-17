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
// Public AST-transform hook type. `transforms: AstTransform[]` runs
// `@glimmer/syntax`-style visitors on the parsed template AST after preprocess,
// before glimmer-next codegen.
// @ts-ignore - type-only; some published versions lack this export (see compile.ts footer note)
import { type AstTransform as GxtAstTransform } from '@lifeart/gxt/runtime-compiler';
import { DEBUG } from '@glimmer/env';

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
        options?: {
          attrs?: unknown[];
          children?: unknown[];
          selfClosing?: boolean;
          // Names, or the parsed `VarHead` nodes of a block's params.
          blockParams?: unknown[];
        }
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
      boolean(value: boolean): unknown;
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
 * Applied to templates compiled at runtime (via `compile()` /
 * `precompileTemplate()` from addTemplate(), rendering test helpers, etc.).
 * Without it, the GXT compiler treats
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

// The internal argument `gxtAngleBracketDynamicTransform` gives an angle-bracket
// invocation through a path; its value is the path. `$_dc_ember`
// (ember-gxt-wrappers.ts) reads it and drops it from the component's arguments
// (an `_`-prefixed key).
export const GXT_ANGLE_BRACKET_KEY = '__gxtAngleBracket__';

/**
 * `<this.Foo …>`, `<@foo.Bar …>`, `<foo.Bar …>` (an angle-bracket invocation of
 * a component value read through a path) gain the internal argument
 * `@__gxtAngleBracket__="<path>"`.
 *
 * Glimmer resolves a string to the component of that name only for the
 * `{{component}}` keyword in a loose-mode template. An angle-bracket invocation
 * takes a component definition or a curried component, and a string there is an
 * error ("Expected a component definition, but received …"). The GXT compiler
 * lowers `<this.foo />` and `{{component this.foo}}` to the same `$_dc` call, so
 * at render time the invocation tells which syntax it came from by this
 * argument. A named block (`<:name>`) is not an invocation.
 */
function gxtAngleBracketDynamicTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  const argName = `@${GXT_ANGLE_BRACKET_KEY}`;
  return {
    name: 'ember-gxt-angle-bracket-dynamic',
    visitor: {
      ElementNode(node: any): void {
        const tag = node.tag;
        if (typeof tag !== 'string' || !tag.includes('.') || tag.startsWith(':')) return;
        if (node.attributes.some((attr: any) => attr.name === argName)) return;
        node.attributes.push(b.attr(argName, b.text(tag)));
      },
    },
  };
}

/**
 * A component's `{{else}}` block, `<:else>` and `<:inverse>` are one block,
 * named `inverse` here.
 *
 * Glimmer gives the block one name whatever spells it: a curly invocation's
 * `{{else}}` block and a `<:inverse>` named block are the block `else`, and
 * `{{yield to="inverse"}}` and `(has-block "inverse")` look up `else`
 * (@glimmer/syntax `SymbolTable.allocateBlock`, @glimmer/compiler's named-block
 * encoding). The GXT compiler names a curly component's `{{else}}` block
 * `inverse` (a `:inverse` named block), and gxt's `$_slot` finds a block by its
 * exact name, so the one name here is `inverse`:
 *
 *   - `{{yield to="else"}}` → `{{yield to="inverse"}}`;
 *   - `<:else>…</:else>` → `<:inverse>…</:inverse>`;
 *   - `{{#component X …}}A{{else}}B{{/component}}` →
 *     `{{#component X …}}<:default>A</:default><:inverse>B</:inverse>{{/component}}`,
 *     the default block keeping the main block's params. The GXT compiler
 *     builds a `{{#component}}` block's component from the main block alone and
 *     drops its `{{else}}` block; named blocks are what it passes for a
 *     component invocation. Not for a bare `@arg` component (also
 *     `{{#@arg}}…{{else}}…{{/@arg}}`, which `gxtBlockAtArgTransform` turns into
 *     a `{{#component @arg}}` block): its `<@arg>` invocation has no named
 *     blocks.
 *
 * `(has-block "else")` and `(has-block-params "else")` need no rewrite: their
 * runtime lookup accepts either name (compile.ts `_lookupSlot`). A template
 * that shadows `component` (a scope value or a block param of that name) keeps
 * its `{{#component}}` blocks: the GXT compiler then invokes the binding as a
 * component, `{{else}}` block included.
 */
function gxtElseBlockTransform(
  scopeValues: Record<string, unknown> | undefined,
  blockParamNames: Set<string>
) {
  const componentShadowed =
    blockParamNames.has('component') ||
    (scopeValues !== undefined && Object.prototype.hasOwnProperty.call(scopeValues, 'component'));
  return (env: GxtAstEnv) => {
    const b = env.syntax.builders;
    const isKeyword = (path: any, name: string): boolean =>
      !!path &&
      path.type === 'PathExpression' &&
      !!path.head &&
      path.head.type === 'VarHead' &&
      path.head.name === name &&
      path.tail.length === 0;
    return {
      name: 'ember-gxt-else-block',
      visitor: {
        MustacheStatement(node: any): void {
          if (!isKeyword(node.path, 'yield')) return;
          for (const pair of node.hash.pairs) {
            const value = pair.value;
            if (pair.key === 'to' && value?.type === 'StringLiteral' && value.value === 'else') {
              pair.value = b.string('inverse');
            }
          }
        },
        ElementNode(node: any): void {
          if (node.tag === ':else') node.tag = ':inverse';
        },
        BlockStatement(node: any): void {
          if (componentShadowed || !node.inverse || node.params.length === 0) return;
          if (!isKeyword(node.path, 'component')) return;
          // A bare `@arg` component is invoked as `<@arg>` (compile.ts
          // `$_tag_ember`), which takes all block content as the default block
          // and has no named blocks: its `{{else}}` block stays dropped.
          const head = node.params[0];
          if (head.type === 'PathExpression' && head.head?.type === 'AtHead' && !head.tail.length) {
            return;
          }
          const program = node.program;
          const inverse = node.inverse;
          // The parsed `VarHead`s keep their source locations.
          const defaultBlock = b.element(':default', {
            blockParams: program.params ?? program.blockParams,
            children: program.body,
          });
          const inverseBlock = b.element(':inverse', {
            blockParams: inverse.params ?? inverse.blockParams,
            children: inverse.body,
          });
          program.body = [defaultBlock, inverseBlock];
          program.blockParams = [];
          node.inverse = null;
        },
      },
    };
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
 *
 * A block param in scope is a local variable, not a helper name: Glimmer reads
 * `class="index-{{index}}"` inside `{{#each … as |item index|}}` as the
 * variable, and so does this transform (it keeps such a mustache as it is). As
 * a helper call the value was resolved as a helper and a falsy one was lost
 * (`index-` for the row at index 0). Block params are scoped as in Glimmer: a
 * block's params cover its body, an element's params its children (not its
 * own attributes).
 */
function gxtAttrQuotedHelperTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  // Block-param binders in scope, innermost last, each with the node that
  // declares it (a program/inverse `Block` or an `ElementNode`).
  const scopes: Array<{ owner: unknown; names: string[] }> = [];
  // Whether `name` is a block param in scope for an attribute of `element`.
  const isBlockParam = (name: string, element: unknown): boolean =>
    scopes.some((frame) => frame.owner !== element && frame.names.includes(name));
  const enterBinder = (node: any): void => {
    scopes.push({ owner: node, names: node.blockParams || [] });
  };
  const exitBinder = (): void => {
    scopes.pop();
  };
  function rewriteMustache(node: any, element: unknown): unknown {
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
      if (isBlockParam(name, element)) return undefined;
      return b.mustache(b.sexpr(b.path(name)));
    }
    return undefined;
  }
  return {
    name: 'ember-gxt-attr-quoted-helper',
    visitor: {
      Block: { enter: enterBinder, exit: exitBinder },
      ElementNode: { enter: enterBinder, exit: exitBinder },
      AttrNode(node: any, path: any): void {
        const v = node.value;
        if (!v) return;
        // The element the attribute is on.
        const element = path && path.parent && path.parent.node;
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
              const r = rewriteMustache(part, element);
              if (r) v.parts[i] = r;
            }
          }
        }
      },
    },
  };
}

/**
 * `{{#each-in EXPR key=K as |KEY VALUE|}}BODY{{else}}ELSE{{/each-in}}` →
 * `{{#each (gxtEntriesOf EXPR K) key="key" as |__ei__|}}
 *    {{#let __ei__.k __ei__.v as |KEY VALUE|}}BODY{{/let}}
 *  {{else}}ELSE{{/each}}`
 *
 * (and the one-param / zero-param variants; K is `"@identity"` when the
 * each-in has no `key=`). `gxtEntriesOf` returns `[{k, v, key}, ...]` for
 * objects, Maps, proxies, and custom iterables, `key` being the key of the
 * entry's row as Glimmer keys an each-in by K (utils.ts `keyEachInEntries`),
 * so a row is kept, moved or replaced as in Glimmer.
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
        // The entries are keyed by the each-in's `key=` option (`@identity` by
        // default), as Glimmer keys an each-in list: `gxtEntriesOf` gives each
        // entry the key of its row (utils.ts `keyEachInEntries`) in its `key`
        // property, which keys the list.
        const keyPair = node.hash.pairs.find((pair: any) => pair.key === 'key');
        const keyOption = keyPair ? keyPair.value : b.string('@identity');
        const entriesOf = b.sexpr(b.path('gxtEntriesOf'), [expr, keyOption]);
        const keyHash = b.hash([b.pair('key', b.string('key'))]);
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
 *     `{{#-with-dynamic-vars}}` block calls for an `Ember.assert` with the
 *     `-with-dynamic-scope` message; any other key on a `-get-dynamic-var` call
 *     for one with the `-get-dynamic-scope` message. The visitor records the
 *     first such message in `findings.dynamicScope` and `precompileTemplate`
 *     fires the assert after the compile call (see GxtAssertFindings): an
 *     assert raised inside the visitor would be caught by the GXT compiler as a
 *     compile error. These asserts are what the `expectAssertion` tests in
 *     `with-dynamic-var-test.js` rely on.
 *   - `{{#-with-dynamic-vars outletState=EXPR}}BODY{{/-with-dynamic-vars}}`
 *     lowers to `{{#let EXPR as |VAR|}}BODY'{{/let}}` (GXT accepts `{{#let}}`),
 *     where BODY' has inner `{{-get-dynamic-var "outletState"}}` rewritten to the
 *     generated `VAR`. A `-with-dynamic-vars` block with NO `outletState` key
 *     lowers to BODY' directly (no `{{#let}}` wrapper), exactly as the string
 *     version did.
 *   - A top-level (out-of-scope) or non-`outletState` `-get-dynamic-var` lowers
 *     to the `gxtGetOutletState` built-in helper call (mustache form
 *     `{{(gxtGetOutletState)}}`, subexpression form `(gxtGetOutletState)`),
 *     which reads the current outlet state (`getCurrentOutletState()`).
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
function gxtDynamicVarsTransform(findings: GxtAssertFindings) {
  return (env: GxtAstEnv) => gxtDynamicVarsVisitor(env, findings);
}

function gxtDynamicVarsVisitor(env: GxtAstEnv, findings: GxtAssertFindings) {
  const b = env.syntax.builders;
  // The first non-`outletState` key, as the message of the assert
  // `precompileTemplate` fires.
  const recordDynamicScopeAssert = (message: string): void => {
    if (findings.dynamicScope === null) findings.dynamicScope = message;
  };
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
              recordDynamicScopeAssert(
                `Using \`-with-dynamic-scope\` is only supported for \`outletState\` (you used \`${pair.key}\`).`
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
        recordDynamicScopeAssert(
          `Using \`-get-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`
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
        recordDynamicScopeAssert(
          `Using \`-get-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`
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

// The tags whose block params this transform binds (`gxtBlockParamsTransform`):
// a PascalCase tag (possibly dotted/dashed) OR a kebab-case tag (a
// dash-containing lowercase name), i.e. a component invoked by name, which gxt
// compiles to `$_tag('Name', …)` with its block as plain children. Dynamic tags
// (`<this.Foo …>`, `<@foo …>`, `<x.Foo …>`) and bare lowercase tags are left to
// glimmer-next, which compiles their blocks as slot functions with the block
// params as arguments.
const _GXT_BP_PASCAL_TAG_RE = /^[A-Z][a-zA-Z0-9.-]*$/;
const _GXT_BP_KEBAB_TAG_RE = /^[a-z][a-z0-9]*-[a-z0-9-]*$/;
function _gxtBpTagMatches(tag: string): boolean {
  return _GXT_BP_PASCAL_TAG_RE.test(tag) || _GXT_BP_KEBAB_TAG_RE.test(tag);
}

/**
 * The named-argument marker of a block scope (`gxtBlockParamsTransform`): the
 * `$_dc` invocation whose arguments carry it is the block of a by-name
 * component invocation, not a component (compile.ts `$_dc` returns a
 * `GxtBlockScope` for it).
 */
export const GXT_BLOCK_SCOPE_KEY = '__gxtBlockScope__';

/**
 * Angle-bracket block params of a component invoked by name, bound per block
 * invocation:
 *   `<Foo as |x y|>{{x}} {{y.prop}}</Foo>`
 *     → `<Foo @__hasBlockParams__="default">{{#this.$_gxtBlockScope __gxtBlockScope__=true as |__gxtBp1|}}{{__gxtBp1.$_bp0}} {{__gxtBp1.$_bp1.prop}}{{/this.$_gxtBlockScope}}</Foo>`
 *   `<Foo as |x|><x.Trigger .../></Foo>` → `… <__gxtBp1.$_bp0.Trigger .../> …`
 *   `<Foo><:item as |x|>{{x}}</:item></Foo>` → the same, inside `<:item>`.
 *
 * gxt compiles a by-name component tag to `$_tag('Foo', …)` with its block as
 * plain children: the block params are not bound by anything. As Glimmer binds
 * a block's params lexically, per invocation of the block (each `{{yield}}`
 * renders the block with its own params), the block becomes a block statement
 * that gxt compiles to a slot function taking ONE param, `__gxtBp<depth>` (a
 * distinct name per nesting level, so an inner block never shadows an outer
 * block's params), and every read of a block param `x` becomes a read of
 * `__gxtBp<depth>.$_bp<i>`. compile.ts renders that slot function once per
 * invocation of the component's block with a `GxtBlockParams` of that
 * invocation's params, whose `$_bp<i>` getters read the i-th param (a reactive
 * one re-read on every read). The marker argument `__gxtBlockScope__` tells
 * compile.ts's `$_dc` that the block statement is that block, and
 * `@__hasBlockParams__` tells the slot machinery the block declared params.
 *
 * A component whose name is in scope (a strict-mode local, a block param)
 * compiles to `$_c` / `$_dc` with its block as a slot function whose arguments
 * are the block params: its params (and its named blocks') are left to gxt.
 * A curly component block (`{{#foo-bar as |x|}}`) is not an element: gxt
 * compiles it, at any depth, to `$_c('FooBar', …)` with its block as a slot
 * function, and a `<FooBar>` element of the same template stays a by-name
 * invocation bound here.
 *
 * Every block-param binder is scope-stacked (element AND `{{#block as |..|}}`),
 * so an inner binder re-declaring a name shadows the outer one; only the
 * element binders of a bound block are rewritten.
 *
 * Path rewrites MUTATE the parsed node in place (head → `__gxtBp<depth>`,
 * `$_bp<i>` prepended to the tail), so the node's `loc` stays.
 */
function gxtBlockParamsTransform(scopeValues: Record<string, unknown> | undefined) {
  return (env: GxtAstEnv) => {
    const b = env.syntax.builders;
    // Scope stack of frames; each frame is an array of { name, ref? }. A `ref`
    // (e.g. `['__gxtBp1', '$_bp0']`) marks a param of a bound block (reads are
    // rewritten to it); a ref-less entry is a binder gxt binds itself.
    type Binding = { name: string; ref?: [string, string] };
    const scopes: Binding[][] = [];
    let depth = 0;
    const resolve = (name: string): Binding | null => {
      for (let i = scopes.length - 1; i >= 0; i--) {
        const hit = scopes[i]!.find((e) => e.name === name);
        if (hit) return hit; // nearest binder wins
      }
      return null;
    };
    // A tag naming a component in scope: a scope value or a block param.
    const isLexicalTag = (tag: string): boolean => {
      const dot = tag.indexOf('.');
      const head = dot === -1 ? tag : tag.slice(0, dot);
      if (scopeValues && Object.prototype.hasOwnProperty.call(scopeValues, head)) return true;
      return resolve(head) !== null;
    };
    // Rewrite a yielded contextual-component tag `<param.Foo …>` → `<__gxtBp1.$_bp0.Foo …>`,
    // and a tag that is the param itself, `<param …>` → `<__gxtBp1.$_bp0 …>`: as in
    // Glimmer, a tag naming a block param in scope invokes the param's value as
    // a component, whatever its case. Resolved against the ENCLOSING scope
    // (called before this element pushes its own params).
    const rewriteTag = (node: any): void => {
      const tag: string = node.tag;
      if (!tag) return;
      const dot = tag.indexOf('.');
      const head = dot === -1 ? tag : tag.slice(0, dot);
      const hit = resolve(head);
      if (!hit || hit.ref === undefined) return;
      const ref = hit.ref.join('.');
      node.tag = dot === -1 ? ref : `${ref}.${tag.slice(dot + 1)}`;
    };
    // Bind `node`'s block params: its children become the block of a block
    // scope with one param, `__gxtBp<depth>`, and its params' reads become reads
    // of that param's `$_bp<i>`.
    const bindBlock = (node: any, params: string[]): void => {
      depth++;
      const binder = `__gxtBp${depth}`;
      scopes.push(params.map((name, i) => ({ name, ref: [binder, `$_bp${i}`] })));
      node.attributes.push(b.attr('@__hasBlockParams__', b.text('default')));
      node.children = [
        b.block(
          b.path('this.$_gxtBlockScope'),
          [],
          b.hash([b.pair(GXT_BLOCK_SCOPE_KEY, b.boolean(true))]),
          b.blockItself(node.children, [binder])
        ),
      ];
      node.__gxtBpBound = true;
    };
    return {
      name: 'ember-gxt-block-params',
      visitor: {
        ElementNode: {
          enter(node: any, path: any): void {
            rewriteTag(node);
            const tag: string = node.tag || '';
            const bp: string[] = node.blockParams || [];
            if (tag.startsWith(':')) {
              // A named block: bound when its component is invoked by name.
              const parent = path && path.parent && path.parent.node;
              if (bp.length && parent && parent.__gxtByName === true) {
                bindBlock(node, bp);
              } else {
                scopes.push(bp.map((n) => ({ name: n })));
              }
              return;
            }
            if (_gxtBpTagMatches(tag) && !isLexicalTag(tag)) {
              node.__gxtByName = true;
              if (bp.length) {
                bindBlock(node, bp);
                return;
              }
            }
            // Block params gxt binds (a dynamic or lexical component's), or none:
            // its params shadow outer ones.
            scopes.push(bp.map((n) => ({ name: n })));
          },
          exit(node: any): void {
            scopes.pop();
            if (node.__gxtBpBound) {
              depth--;
              node.blockParams = [];
              delete node.__gxtBpBound;
            }
            delete node.__gxtByName;
          },
        },
        // `{{#each items as |item|}}` / `{{#let … as |x|}}` etc. — the program /
        // inverse `Block` carries the binder. These shadow but are NEVER rewritten
        // (glimmer-next resolves them as native block params).
        Block: {
          enter(node: any): void {
            const bp: string[] = node.blockParams || [];
            scopes.push(bp.map((n) => ({ name: n })));
          },
          exit(): void {
            scopes.pop();
          },
        },
        PathExpression(node: any): void {
          if (!node.head || node.head.type !== 'VarHead') return;
          const hit = resolve(node.head.name);
          if (!hit || hit.ref === undefined) return;
          // Mutate in place (preserve `loc`): head → the block's param, prepend `$_bp{N}`.
          node.head = (b.path(hit.ref[0]) as any).head;
          node.tail = [hit.ref[1], ...(node.tail || [])];
          if (typeof node.original === 'string') {
            node.original = `${hit.ref[0]}.${(node.tail as string[]).join('.')}`;
          }
        },
      },
    };
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
 * A helper called without arguments (`helperCall`, see `_gxtTripleIsHelperCall`)
 * is a SubExpression too: `{{{foo-bar}}}` becomes `{{(foo-bar)}}`.
 */
function _gxtTripleValueExpr(
  b: GxtAstEnv['syntax']['builders'],
  node: any,
  helperCall = false
): unknown {
  if (node.params.length === 0 && node.hash.pairs.length === 0 && !helperCall) {
    return b.mustache(node.path);
  }
  return b.mustache(b.sexpr(node.path, node.params, node.hash));
}

/**
 * Whether a triple-mustache without arguments, `{{{name}}}`, calls a helper:
 * its path is a free name (not `this.x`, `@x` or a path with members) that is
 * not a keyword, a scope value or a block param in scope. Glimmer appends the
 * result of the call as trusted content; as the `@value` of `<EmberHtmlRaw>`
 * the bare name would be a helper passed by reference (the named-argument
 * position, where a resolved helper is an error), so it is written as a call,
 * `(name)`.
 */
function _gxtTripleIsHelperCall(
  node: any,
  path: any,
  scopeValues: Record<string, unknown> | undefined
): boolean {
  if (node.params.length !== 0 || node.hash.pairs.length !== 0) return false;
  const p = node.path;
  if (!p || p.type !== 'PathExpression') return false;
  if (!p.head || p.head.type !== 'VarHead' || p.tail.length !== 0) return false;
  const name: string = p.head.name;
  if (!_GXT_ATTR_BARE_IDENT_RE.test(name)) return false;
  if (_GXT_ATTR_QUOTED_HELPER_BUILTINS.has(name)) return false;
  if (scopeValues !== undefined && Object.prototype.hasOwnProperty.call(scopeValues, name)) {
    return false;
  }
  // A block param of an enclosing block or element (the mustache is content
  // here, so an element's params cover it).
  for (let a = path && path.parent; a; a = a.parent) {
    const binder = a.node;
    if (binder && Array.isArray(binder.blockParams) && binder.blockParams.includes(name)) {
      return false;
    }
  }
  return true;
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
 *
 * Attribute position: `attr={{{expr}}}` → `attr={{expr}}`, and an unquoted
 * `style={{{expr}}}` → `style={{(__gxtTrustedStyle expr)}}` (see the visitor).
 */
function gxtTripleMustacheTransform(scopeValues?: Record<string, unknown>) {
  return (env: GxtAstEnv) => gxtTripleMustacheVisitor(env, scopeValues);
}

function gxtTripleMustacheVisitor(env: GxtAstEnv, scopeValues?: Record<string, unknown>) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-triple-mustache',
    visitor: {
      MustacheStatement(node: any, path: any): unknown {
        if (node.escaped !== false) return undefined;
        // ATTRIBUTE position. Glimmer compiles an unquoted `attr={{{x}}}` to a
        // trusting dynamic attribute: the same value as `attr={{x}}` (removed
        // when nullish, URLs still sanitized), except that a trusting `style`
        // does not fire the style-binding XSS warning. Inside a quoted value
        // (a concat part) and as a component argument the trusting flag has
        // no effect. So the value is the escaped `{{x}}`, and an unquoted
        // `style` wraps it in the `__gxtTrustedStyle` built-in, which marks it
        // as trusted for the warning.
        const parent = path && path.parent && path.parent.node;
        const pt = parent && parent.type;
        if (pt === 'AttrNode' || pt === 'ConcatStatement') {
          if (pt === 'AttrNode' && parent.name === 'style') {
            const value =
              node.params.length === 0 && node.hash.pairs.length === 0
                ? node.path
                : b.sexpr(node.path, node.params, node.hash);
            return b.mustache(b.sexpr(b.path('__gxtTrustedStyle'), [value]));
          }
          return b.mustache(node.path, node.params, node.hash);
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
        const helperCall = _gxtTripleIsHelperCall(node, path, scopeValues);
        const el: any = b.element('EmberHtmlRaw', {
          attrs: [b.attr('@value', _gxtTripleValueExpr(b, node, helperCall))],
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
 * `gxtOutletTransform`, `gxtBlockAtArgTransform`, `gxtElseBlockTransform`,
 * `gxtAttrQuotedHelperTransform`, `gxtEachInTransform`, `gxtDynamicVarsTransform`,
 * `gxtBlockParamsTransform` and `gxtBodyBareHelperTransform` are always active
 * (they target disjoint node kinds
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
  'boolean',
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
 * catches any exception raised inside a transform into its `errors[]` array,
 * and `precompileTemplate` re-throws those only as a generic compile error (the
 * message of a non-Error value, such as `expectAssertion`'s stub break, is
 * lost). Detecting in the visitor (AST-exact, replacing the former source
 * scanners) but firing the assert/throw from `precompileTemplate` preserves the
 * original control flow (the assert's own throw, real compile abort) exactly.
 */
export interface GxtAssertFindings {
  textArea: boolean;
  dynamicHelper: boolean;
  dynamicModifier: boolean;
  // First offending `{{head.tail}}` (matches the former scanner, which threw on
  // the first match in document order).
  dottedMustache: { head: string; tail: string } | null;
  // The message of the first `-with-dynamic-vars` / `-get-dynamic-var` use of
  // a key other than `outletState` (recorded by `gxtDynamicVarsTransform`).
  dynamicScope: string | null;
  // Every `this.attrs.<name>` path, as written (development builds only): each
  // gets the `attrs-arg-access` deprecation.
  thisAttrs: string[];
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

/**
 * `{{this.attrs.foo}}`: a deprecated way to read the named argument `@foo`.
 * Read-only visitor; records each such path (as Ember's `assert-against-attrs`
 * plugin deprecates each one) and `precompileTemplate` fires the deprecation.
 */
function gxtThisAttrsDeprecation(findings: GxtAssertFindings) {
  return function (_env: GxtAstEnv) {
    return {
      name: 'ember-gxt-deprecate-this-attrs',
      visitor: {
        PathExpression(node: any): void {
          if (node.head?.type === 'ThisHead' && node.tail?.[0] === 'attrs') {
            findings.thisAttrs.push(String(node.original));
          }
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

// ── Helper call sites ──────────────────────────────────────────────────────
// The named-argument key that carries a helper call's site id (see
// `gxtHelperCallSiteTransform`); `$_maybeHelper_ember` takes it out of the
// call's named arguments before anything else reads them.
export const GXT_HELPER_SITE_KEY = '__gxtSite';

// Site ids are unique across every template compiled in the process, so two
// templates rendered with the same `this` cannot share a site.
let _gxtHelperCallSiteCounter = 0;

// Names gxt or the Ember dialect compile as keywords / built-ins (never a
// `$_maybeHelper` call by name; gxt's own keyword sets include `mount`,
// `input` and `textarea`, which compile to elements / components), plus the
// names the transforms here inject.
const _GXT_HELPER_SITE_SKIP: ReadonlySet<string> = new Set([
  ..._GXT_ATTR_QUOTED_HELPER_BUILTINS,
  'eq',
  'not',
  'or',
  'and',
  'element',
  'mount',
  'input',
  'textarea',
  'hasBlock',
  'hasBlockParams',
  'gxtEntriesOf',
  'gxtGetOutletState',
  _GXT_ON_EXT_ALIAS,
]);

/**
 * Give each helper call site its own id: `(my-helper a)` / `{{my-helper a}}`
 * gain a `__gxtSite=<id>` named argument.
 *
 * Glimmer creates one helper instance per call site and render scope; the
 * compat compiler's call (`$_maybeHelper("my-helper", [a], this)`) carries the
 * render scope (`this` or a block's context) but nothing that tells two call
 * sites in one scope apart, so the runtime kept one instance per helper NAME
 * (two sibling `{{my-helper}}`s, every `{{#each}}` row and every component
 * shared it). With the id, `$_maybeHelper_ember` keeps one instance per
 * (render scope, site) and destroys it with the scope.
 *
 * Only calls gxt emits as `$_maybeHelper` by NAME are marked: a free
 * single-part name (not `this.x`, `@x`, a path, a block param or a scope
 * value) that is not a keyword, called with at least one positional argument
 * — a SubExpression, or a MustacheStatement (content or attribute). A call
 * with only named arguments can compile as a component (`{{foo-bar a=1}}` is
 * `<FooBar @a={{1}} />`), and a zero-argument one keeps its exact emission
 * (the named-argument resolved-helper guard in compile.ts matches it). Runs
 * last, on the nodes the other transforms produced.
 */
function gxtHelperCallSiteTransform(
  scopeValues: Record<string, unknown> | undefined,
  blockParamNames: Set<string>
) {
  return (env: GxtAstEnv) => {
    const b = env.syntax.builders;
    const mark = (node: any): void => {
      const p = node.path;
      if (!p || p.type !== 'PathExpression') return;
      if (!p.head || p.head.type !== 'VarHead' || p.tail.length !== 0) return;
      if (node.params.length === 0) return;
      const name: string = p.head.name;
      if (_GXT_HELPER_SITE_SKIP.has(name) || name.startsWith('__') || name.startsWith('-')) {
        return;
      }
      if (blockParamNames.has(name)) return;
      if (scopeValues && Object.prototype.hasOwnProperty.call(scopeValues, name)) return;
      const pairs: any[] = node.hash.pairs;
      if (pairs.some((pair) => pair.key === GXT_HELPER_SITE_KEY)) return;
      pairs.push(b.pair(GXT_HELPER_SITE_KEY, b.string(String(++_gxtHelperCallSiteCounter))));
    };
    return {
      name: 'ember-gxt-helper-call-site',
      visitor: {
        SubExpression: mark,
        MustacheStatement: mark,
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
  // AFTER the compile call (the GXT compiler catches transform-internal throws
  // into errors[], keeping only a message — see GxtAssertFindings). These visitors never touch `env.syntax.builders`, so
  // running before the tbody env-shape guard is safe; the guard still fires on
  // the first builder-using transform (tbody) below.
  //
  // NOTE: `findDottedTags` (the `<foo.bar>` tag-not-in-scope assert) is
  // intentionally NOT ported — its tested "requires whitespace after the tail"
  // quirk can't be reproduced from the normalized AST without re-inspecting
  // source, so it stays a pre-compile string assert in `precompileTemplate`.
  // `{{attrs.x}}` is caught by the dotted-mustache visitor (`attrs` is not in
  // scope); `{{this.attrs.x}}` is deprecated, in development builds.
  const scopeValueNames = scopeValues ? new Set(Object.keys(scopeValues)) : null;
  const bpNames = blockParamNames || new Set<string>();
  const findings: GxtAssertFindings = assertFindings || {
    textArea: false,
    dynamicHelper: false,
    dynamicModifier: false,
    dottedMustache: null,
    dynamicScope: null,
    thisAttrs: [],
  };
  const transforms: GxtAstTransform[] = [
    gxtTextAreaTypoAssert(findings) as unknown as GxtAstTransform,
    gxtDottedMustacheAssert(findings, scopeValueNames, bpNames) as unknown as GxtAstTransform,
    gxtDynamicHelperAssert(findings) as unknown as GxtAstTransform,
    gxtDynamicModifierAssert(findings) as unknown as GxtAstTransform,
    ...(DEBUG ? [gxtThisAttrsDeprecation(findings) as unknown as GxtAstTransform] : []),
    // The tbody builder is wrapped with the once-per-process env-shape guard
    // (see assertGxtAstEnvShape). It is the FIRST builder-using transform (the
    // assert-detection visitors above are read-only and touch no builders), and
    // the tbody↔triple order is load-bearing (see the doc comment above), so
    // wrapping it guards every later builder-using visitor too.
    ((env: GxtAstEnv) => {
      assertGxtAstEnvShape(env);
      return gxtTableTbodyTransform(env);
    }) as unknown as GxtAstTransform,
    gxtTripleMustacheTransform(scopeValues) as unknown as GxtAstTransform,
    gxtHtmlCommentTransform as unknown as GxtAstTransform,
    gxtOutletTransform as unknown as GxtAstTransform,
    gxtBlockAtArgTransform as unknown as GxtAstTransform,
    gxtAngleBracketDynamicTransform as unknown as GxtAstTransform,
    gxtElseBlockTransform(scopeValues, bpNames) as unknown as GxtAstTransform,
    gxtAttrQuotedHelperTransform as unknown as GxtAstTransform,
    gxtEachInTransform as unknown as GxtAstTransform,
    gxtDynamicVarsTransform(findings) as unknown as GxtAstTransform,
    gxtBlockParamsTransform(scopeValues) as unknown as GxtAstTransform,
    gxtBodyBareHelperTransform(scopeValues) as unknown as GxtAstTransform,
  ];
  if (includeOnExt) {
    transforms.push(gxtOnModifierTransform as unknown as GxtAstTransform);
  }
  transforms.push(gxtHelperCallSiteTransform(scopeValues, bpNames) as unknown as GxtAstTransform);
  return transforms;
}
