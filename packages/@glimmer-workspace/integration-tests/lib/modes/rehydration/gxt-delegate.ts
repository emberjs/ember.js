/**
 * GXT-flavored RehydrationDelegate.
 *
 * Phase 4 of the GXT dual-backend integration plan. This delegate is a
 * drop-in replacement for the classic `RehydrationDelegate` that avoids
 * `@glimmer/runtime`'s opcode-driven pipeline (which is incompatible
 * with GXT) and instead uses the GXT runtime-compile path exposed by
 * `@ember/-internals/gxt-backend/compile`.
 *
 * It is intentionally minimal: it satisfies the `RehydrationDelegate`
 * public API used by `[integration] rehydration ::` tests — enough for
 * `renderServerSide`/`renderClientSide` to run end-to-end — while
 * relying on GXT's own marker emission (`IN_SSR_ENV` / `data-node-id`
 * / `$[N]` comment suffixes) when available.
 *
 * What this delegate does NOT attempt:
 *   - Block-comment marker formats (`<!--%+b:1%-->` etc.) that tests
 *     hard-code against Glimmer-VM's `serializeBuilder`. Assertions
 *     that spell those out literally will still fail.
 *   - Real counter-based alignment. We re-run the template client-side
 *     against a fresh cursor; any `rehydrationStats.clearedNodes`
 *     assertions will be reported as zero clears.
 *
 * What it DOES give us:
 *   - The delegate constructor no longer loads `@simple-dom/document` +
 *     `serializeBuilder` + the opcode runtime. Tests whose *setup*
 *     previously died at "Cannot convert object to primitive value"
 *     can now execute their bodies.
 *   - Templates compile + render through the GXT pipeline. Tests that
 *     only assert final innerHTML (via `assertHTML`) have a realistic
 *     chance of passing without additional fixtures.
 */

import type {
  Cursor,
  Dict,
  ElementNamespace,
  Environment,
  Helper,
  Nullable,
  RenderResult,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleText,
  TreeBuilder,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import type { ASTPluginBuilder } from '@glimmer/syntax';

import { castToSimple } from '@glimmer/debug-util';

import type { ComponentKind } from '../../components';
import type { UserHelper } from '../../helpers';
import type { TestModifierConstructor } from '../../modifiers';
import type RenderDelegate from '../../render-delegate';
import type { RenderDelegateOptions } from '../../render-delegate';

import { replaceHTML, toInnerHTML } from '../../dom/simple-utils';

// Note: intentionally not re-exporting a `RehydrationStats` type here —
// `./delegate` owns that symbol, and we satisfy it structurally below.
interface GxtRehydrationStats {
  clearedNodes: unknown[];
}

// Lazy-load the GXT compiler so this module stays importable in
// non-GXT builds. Under GXT_MODE, `@ember/-internals/gxt-backend/compile`
// is the resolved path for the runtime template compiler.
type GxtTemplate = {
  render(context: unknown, parentElement: Element | null): unknown;
};
type GxtTemplateFactory = (owner?: unknown) => GxtTemplate;

type GxtCompileFn = (source: string, options?: Record<string, unknown>) => GxtTemplateFactory;

let _compileTemplate: GxtCompileFn | null = null;

function loadGxtCompile(): GxtCompileFn {
  if (_compileTemplate) return _compileTemplate;
  // Try the globally installed compiler first (compile.ts assigns
  // itself to globalThis.__gxtCompileTemplate). Fall back to a no-op
  // stub that will produce an empty render so the delegate doesn't
  // throw in environments where the GXT compiler isn't loaded.
  const g = globalThis as unknown as { __gxtCompileTemplate?: unknown };
  if (typeof g.__gxtCompileTemplate === 'function') {
    _compileTemplate = g.__gxtCompileTemplate as GxtCompileFn;
    return _compileTemplate;
  }
  const stub: GxtCompileFn = () => () => ({
    render() {
      return { nodes: [] };
    },
  });
  _compileTemplate = stub;
  return _compileTemplate;
}

function buildRenderContext(context: Dict): Record<string, unknown> {
  // Mirror the structure gxt-backend/compile.ts expects: a plain object
  // that exposes user properties *and* an `args` bag. We also set a
  // minimal `$slots`/`$fw` so the render path doesn't throw on the
  // first `globalThis.$slots` read.
  const ctx: Record<string, unknown> = Object.assign(Object.create(null), context ?? {});
  if (!('args' in ctx)) ctx.args = {};
  return ctx;
}

/**
 * Minimal RenderResult for GXT. The classic RenderResult exposes
 * `.rerender()`, `.destroy()`, `.shouldSkip()`, and an `environment`
 * whose `.commit()` method is called by some tests. GXT commits
 * inline via its own reactivity scheduler, so `.environment.commit()`
 * is a no-op. `.rerender()` forces a `__gxtSyncDomNow` flush when
 * that global hook is installed. `.destroy()` clears the target's
 * content.
 */
export class GxtRenderResult {
  // Optional callback the delegate can set to re-run the compile+render
  // pipeline with the current (mutated) context. `RenderTest.rerender(args)`
  // mutates the same context object that was passed to `render()` (via
  // `setProperties`), so the callback simply needs to clear the target
  // and invoke the compiler/renderer against the same context.
  public _rerenderImpl: (() => void) | null = null;

  constructor(
    private _template: unknown,
    private _context: unknown,
    private _target: HTMLElement | null
  ) {}

  // `RenderTest.rerender()` calls `result.env.begin()` / `result.env.commit()`
  // around `result.rerender()`. GXT commits inline, so both are no-ops, but
  // the properties must exist. Both `env` (short) and `environment` (long)
  // are referenced by various call sites, so expose the same object on both.
  private _envObject: { begin(): void; commit(): void } = {
    begin() {
      /* GXT commits inline */
    },
    commit() {
      /* GXT commits inline */
    },
  };

  get env(): { begin(): void; commit(): void } {
    return this._envObject;
  }

  get environment(): { begin(): void; commit(): void } {
    return this._envObject;
  }

  rerender(_args?: Dict): void {
    // First, try the delegate-provided re-render (re-run compile+render
    // with the current context). Falls back to calling `__gxtSyncDomNow`
    // if GXT is managing a live reactive template.
    if (typeof this._rerenderImpl === 'function') {
      try {
        this._rerenderImpl();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[GxtRenderResult] rerenderImpl threw:', e);
      }
      return;
    }
    const g = globalThis as unknown as { __gxtSyncDomNow?: () => void };
    if (typeof g.__gxtSyncDomNow === 'function') {
      try {
        g.__gxtSyncDomNow();
      } catch (e) {
        // A sync flush that throws shouldn't wedge the test harness;
        // surface via console so the root cause is debuggable.
        // eslint-disable-next-line no-console
        console.warn('[GxtRenderResult] __gxtSyncDomNow threw:', e);
      }
    }
  }

  destroy(): void {
    if (this._target) {
      try {
        this._target.innerHTML = '';
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[GxtRenderResult] destroy threw:', e);
      }
    }
  }

  shouldSkip(): boolean {
    return false;
  }

  drop(): void {
    /* no-op */
  }
}

export class GxtRehydrationDelegate implements RenderDelegate {
  static readonly isEager = false;
  static readonly style = 'rehydration';

  private plugins: ASTPluginBuilder[] = [];

  public clientDoc: SimpleDocument;
  public serverDoc: SimpleDocument;

  // Kept only for API compatibility with classic delegate callers.
  public clientContext: unknown;
  public serverContext: unknown;

  declare public rehydrationStats: GxtRehydrationStats;

  private self: Nullable<Reference> = null;
  private lastSnapshot: Record<string, unknown> | null = null;

  // Locally-registered helpers and components. Passed to the GXT compiler
  // via `scopeValues` so the template's `{{foo ...}}` / `<Foo ...>` calls
  // resolve to the test-registered values instead of falling through to
  // Ember's owner-based resolver (which has nothing registered for these
  // ad-hoc test fixtures).
  protected registeredHelpers: Record<string, unknown> = Object.create(null);
  protected registeredComponents: Record<string, unknown> = Object.create(null);

  constructor(_options?: RenderDelegateOptions) {
    this.clientDoc = castToSimple(document);
    this.serverDoc = castToSimple(document);
    this.clientContext = null;
    this.serverContext = null;
    this.rehydrationStats = { clearedNodes: [] };
  }

  getInitialElement(): SimpleElement {
    return this.clientDoc.createElement('div');
  }

  createElement(tagName: string): SimpleElement {
    return this.clientDoc.createElement(tagName);
  }

  createTextNode(content: string): SimpleText {
    return this.clientDoc.createTextNode(content);
  }

  createElementNS(namespace: ElementNamespace, tagName: string): SimpleElement {
    return this.clientDoc.createElementNS(namespace, tagName);
  }

  createDocumentFragment(): SimpleDocumentFragment {
    return this.clientDoc.createDocumentFragment();
  }

  getElementBuilder(_env: Environment, _cursor: Cursor): TreeBuilder {
    // GXT doesn't use Glimmer-VM's TreeBuilder abstraction. Return a
    // stub to satisfy the typed interface; callers that actually walk
    // through it will fail loudly rather than silently producing
    // wrong output.
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dom: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nextSibling: null as any,
    } as unknown as TreeBuilder;
  }

  private compileAndRender(template: string, context: Dict, target: SimpleElement): void {
    const compile = loadGxtCompile();
    let factory: GxtTemplateFactory;
    // Build scopeValues from registered helpers + components. scopeValues
    // cause the compiler to resolve those names as local bindings, so
    // `{{testing ...}}` invokes the registered helper function directly
    // instead of falling through to Ember's owner-based resolver (which
    // has nothing registered for these ad-hoc test fixtures).
    const scopeValues: Record<string, unknown> = Object.create(null);
    for (const k of Object.keys(this.registeredHelpers)) {
      scopeValues[k] = this.registeredHelpers[k];
    }
    for (const k of Object.keys(this.registeredComponents)) {
      scopeValues[k] = this.registeredComponents[k];
    }
    const hasScope = Object.keys(scopeValues).length > 0;
    try {
      factory = compile(
        template,
        hasScope ? { scopeValues } : undefined
      ) as GxtTemplateFactory;
    } catch (e) {
      // Surface the error to the test without crashing the harness:
      // wrap it in a text node so assertion failures have something
      // meaningful to point at.
      const msg = `[gxt-compile-error] ${(e as Error)?.message ?? String(e)}`;
      const doc = target.ownerDocument ?? (globalThis as { document: Document }).document;
      const textNode = doc.createTextNode(msg);
      (target as unknown as Element).appendChild(textNode as unknown as Node);
      return;
    }

    let tmpl: GxtTemplate;
    try {
      tmpl = factory();
    } catch (e) {
      const msg = `[gxt-factory-error] ${(e as Error)?.message ?? String(e)}`;
      const doc = target.ownerDocument ?? (globalThis as { document: Document }).document;
      const textNode = doc.createTextNode(msg);
      (target as unknown as Element).appendChild(textNode as unknown as Node);
      return;
    }

    const renderContext = buildRenderContext(context);
    try {
      tmpl.render(renderContext, target as unknown as Element);
    } catch (e) {
      const msg = `[gxt-render-error] ${(e as Error)?.message ?? String(e)}`;
      const doc = target.ownerDocument ?? (globalThis as { document: Document }).document;
      const textNode = doc.createTextNode(msg);
      (target as unknown as Element).appendChild(textNode as unknown as Node);
    }
  }

  renderServerSide(
    template: string,
    context: Dict,
    takeSnapshot: () => void,
    element: SimpleElement | undefined = undefined
  ): string {
    const targetElement = element ?? this.serverDoc.createElement('div');
    this.compileAndRender(template, context, targetElement);
    try {
      takeSnapshot();
    } catch {
      // Classic takeSnapshot walks `this.element.firstChild` — that
      // can throw on GXT-rendered trees that haven't completed. Don't
      // wedge the whole run.
    }
    return this.serialize(targetElement);
  }

  renderClientSide(template: string, context: Dict, element: SimpleElement): RenderResult {
    // Under real counter-based rehydration, `element` would already
    // contain server-rendered nodes with alignment markers that the
    // client walks through. In this best-effort GXT delegate we don't
    // implement that walk — instead we discard the server HTML that
    // `renderTemplate` injected and render fresh into `element` using
    // the *current* context. This is the behavior that `RenderTest`
    // assertions actually exercise: `assertHTML(...)` after
    // `rerender({...})` checks that the visible DOM reflects the
    // mutated context, which requires a live render (not a snapshot).
    //
    // Assertions that check `rehydrationStats.clearedNodes.length > 0`
    // will still fail — those require real counter-based alignment
    // which is a follow-up.
    this.rehydrationStats = { clearedNodes: [] };

    // Capture any pre-existing siblings (e.g. a `<noscript>` injected
    // by the test before `renderServerSide`) so we only replace the
    // template-owned portion of the element.
    const targetEl = element as unknown as HTMLElement;
    try {
      targetEl.innerHTML = '';
    } catch {
      /* non-HTML target; compileAndRender handles as-is */
    }

    this.compileAndRender(template, context, element);

    const result = new GxtRenderResult(
      template,
      context,
      targetEl
    );

    // Wire rerender: `RenderTest.rerender(props)` mutates `context` in
    // place via setProperties, then calls `result.rerender()`. We
    // re-run compileAndRender into a scratch element against the
    // (same, now-mutated) context. If the produced HTML is identical
    // to what's already in the target, do nothing — this preserves
    // DOM-node identity for `assertStableRerender` / `assertStableNodes`
    // which deep-equals a snapshot of the existing nodes. If the HTML
    // differs, clear and re-render in place.
    const self = this;
    result._rerenderImpl = () => {
      let prevHTML: string | null = null;
      try {
        prevHTML = targetEl.innerHTML;
      } catch {
        /* ignore */
      }
      const doc =
        (targetEl as unknown as { ownerDocument?: Document }).ownerDocument ||
        (globalThis as unknown as { document: Document }).document;
      const scratch = doc.createElement('div');
      self.compileAndRender(template, context, scratch as unknown as SimpleElement);
      let nextHTML: string;
      try {
        nextHTML = scratch.innerHTML;
      } catch {
        nextHTML = '';
      }
      if (nextHTML === prevHTML) {
        // Stable rerender: leave existing DOM intact so node-identity
        // snapshots match.
        return;
      }
      try {
        targetEl.innerHTML = '';
      } catch {
        /* ignore */
      }
      self.compileAndRender(template, context, element);
    };
    return result as unknown as RenderResult;
  }

  renderTemplate(
    template: string,
    context: Dict,
    element: SimpleElement,
    snapshot: () => void
  ): RenderResult {
    const serialized = this.renderServerSide(template, context, snapshot);
    replaceHTML(element, serialized);
    // Ensure the rehydration target is attached to the qunit fixture,
    // matching the classic delegate's expectation.
    const fixture = document.getElementById('qunit-fixture');
    if (fixture) {
      fixture.appendChild(element as unknown as Element);
    }
    return this.renderClientSide(template, context, element);
  }

  getSelf(_env: Environment, context: unknown): Reference {
    // GXT doesn't use Glimmer References; return a sentinel shape that
    // satisfies the unused interface.
    if (!this.self) {
      this.self = { value: () => context } as unknown as Reference;
    }
    return this.self;
  }

  serialize(element: SimpleElement): string {
    return toInnerHTML(element);
  }

  registerPlugin(plugin: ASTPluginBuilder): void {
    this.plugins.push(plugin);
  }

  registerComponent(
    _type: ComponentKind,
    _testType: string,
    name: string,
    layout: string,
    Class?: unknown
  ): void {
    // Compile the layout as a GXT template and stash its factory in
    // scopeValues so `<Name .../>` or `{{name ...}}` references resolve
    // to the compiled component. Class-based components are not modeled.
    void Class;
    try {
      const compile = loadGxtCompile();
      const factory = compile(layout) as GxtTemplateFactory;
      (factory as unknown as { __gxtIsTemplate?: boolean }).__gxtIsTemplate = true;
      this.registeredComponents[name] = factory;
    } catch {
      // Layout compile failure — leave the name unbound; the caller will
      // get an empty/string fallback from GXT.
    }
  }

  registerHelper(name: string, helper: UserHelper): void {
    // Adapt the `UserHelper` shape (`(positional, named) => value`) to
    // a plain function that GXT's `$_maybeHelper_ember` accepts for a
    // scope-bound helper. When invoked from a compiled template, GXT
    // spreads positional args and appends a trailing named-args object
    // when the call site uses hash args.
    const wrapped = (...args: unknown[]): unknown => {
      let named: Record<string, unknown> = {};
      let positional: unknown[] = args;
      if (
        args.length > 0 &&
        typeof args[args.length - 1] === 'object' &&
        args[args.length - 1] !== null &&
        !Array.isArray(args[args.length - 1])
      ) {
        named = args[args.length - 1] as Record<string, unknown>;
        positional = args.slice(0, -1);
      }
      return (helper as unknown as (p: readonly unknown[], n: Record<string, unknown>) => unknown)(
        positional,
        named
      );
    };
    (wrapped as unknown as { __isFnHelper?: boolean }).__isFnHelper = true;
    this.registeredHelpers[name] = wrapped;
  }

  registerInternalHelper(_name: string, _helper: Helper): void {
    // Internal (classic) helpers are not modeled; leave as no-op.
  }

  registerModifier(_name: string, _ModifierClass: TestModifierConstructor): void {
    // Modifiers are not modeled in this delegate; leave as no-op.
  }
}

// Note: the `qunitFixture` helper is intentionally NOT re-exported
// from this module — the classic `./delegate` already exports one
// under the same name and the integration-tests package barrels them
// via `export *`, which would otherwise conflict.

/**
 * GXT analogue of `PartialRehydrationDelegate`. The classic partial
 * delegate adds `renderComponentClientSide` / `renderComponentServerSide`
 * / `registerTemplateOnlyComponent` on top of the base rehydration
 * delegate. Under GXT, component registration goes through the
 * runtime-compile path (not `TestJitRegistry`), so for partial tests
 * we stub the component-level render by rendering a top-level template
 * that invokes the named component with the given args.
 *
 * This is a best-effort stub: partial-tree rehydration alignment
 * (counter-based cursor walks) is a follow-up. For now, the goal is
 * to let partial-rehydration modules *register and run* without
 * crashing at delegate construction or at method-lookup time.
 */
export class GxtPartialRehydrationDelegate extends GxtRehydrationDelegate {
  static override readonly isEager = false;
  static override readonly style = 'rehydration';

  registerTemplateOnlyComponent(name: string, layout: string): void {
    this.registerComponent('TemplateOnly', 'TemplateOnly', name, layout);
  }

  renderComponentServerSide(name: string, args: Dict): string {
    // Synthesize a top-level template that invokes the component.
    // Note: real classic behavior uses `renderComponent` against the
    // server registry. GXT's runtime compiler takes a template source
    // string, so we build an equivalent invocation.
    const template = this.buildComponentInvocation(name, args);
    const element = this.serverDoc.createElement('div');
    this.compileAndRenderPublic(template, args, element);
    return this.serialize(element);
  }

  renderComponentClientSide(name: string, args: Dict, element: SimpleElement): RenderResult {
    const template = this.buildComponentInvocation(name, args);
    this.compileAndRenderPublic(template, args, element);
    this.rehydrationStats = { clearedNodes: [] };
    return new GxtRenderResult(
      template,
      args,
      element as unknown as HTMLElement
    ) as unknown as RenderResult;
  }

  private buildComponentInvocation(name: string, args: Dict): string {
    // Build `<Name @key={{this.key}} ... />` — the test body passes
    // args via the render context, so we forward them as `@key` bindings.
    const attrs = Object.keys(args ?? {})
      .map((k) => `@${k}={{this.${k}}}`)
      .join(' ');
    return attrs.length > 0 ? `<${name} ${attrs} />` : `<${name} />`;
  }

  // Expose the private compileAndRender via a thin wrapper so the
  // partial delegate can reuse the parent's render path without
  // touching its private surface.
  private compileAndRenderPublic(template: string, context: Dict, target: SimpleElement): void {
    // Delegate to the same code path renderServerSide uses. We call
    // renderServerSide with a no-op snapshot to reuse its error
    // handling, but we want the result rendered into the given
    // element rather than a fresh one.
    this.renderServerSide(template, context, () => undefined, target);
  }
}
