import type {
  CapturedRenderNode,
  Cursor,
  Dict,
  DynamicScope,
  ElementNamespace,
  Environment,
  EvaluationContext,
  HandleResult,
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
import type { CurriedValue, EnvironmentDelegate } from '@glimmer/runtime';
import type { ASTPluginBuilder, PrecompileOptions } from '@glimmer/syntax';
import { castToBrowser, castToSimple, expect, unwrapTemplate } from '@glimmer/debug-util';
import { getComponentTemplate } from '@glimmer/manager';
import { EvaluationContextImpl } from '@glimmer/opcode-compiler';
import { artifacts, RuntimeOpImpl } from '@glimmer/program';
import { createConstRef } from '@glimmer/reference';
import {
  array,
  clientBuilder,
  concat,
  fn,
  get,
  hash,
  on,
  renderComponent,
  renderSync,
  runtimeOptions,
} from '@glimmer/runtime';
import { assign } from '@glimmer/util';

import type { ComponentKind, ComponentTypes } from '../../components';
import type { UserHelper } from '../../helpers';
import type { TestModifierConstructor } from '../../modifiers';
import type RenderDelegate from '../../render-delegate';
import type { RenderDelegateOptions } from '../../render-delegate';

import { BaseEnv } from '../../base-env';
import { preprocess } from '../../compile';
import JitCompileTimeLookup from './compilation-context';
import {
  componentHelper,
  registerComponent,
  registerHelper,
  registerInternalHelper,
  registerModifier,
} from './register';
import { TestJitRegistry } from './registry';
import { renderTemplate } from './render';
import { TestJitRuntimeResolver } from './resolver';

/**
 * Shape of the per-render template object returned by a GXT template
 * factory under `__GXT_MODE__`. The factory comes from
 * `@ember/-internals/gxt-backend/compile.ts#precompileTemplate` (also
 * exposed via `globalThis.__gxtCompileTemplate` and `getGxtRenderer`'s
 * `compilePipeline.compileTemplate`). We type it minimally here — only
 * the `render(ctx, parentEl)` method that the JIT delegate needs to
 * dispatch into.
 */
interface GxtRenderableTemplate {
  render(ctx: Record<string, unknown> | null, parentElement: Element | null): unknown;
}

export function JitDelegateContext(
  doc: SimpleDocument,
  resolver: TestJitRuntimeResolver,
  env: EnvironmentDelegate
): EvaluationContext {
  let sharedArtifacts = artifacts();
  let runtime = runtimeOptions(
    { document: doc },
    env,
    sharedArtifacts,
    new JitCompileTimeLookup(resolver)
  );

  return new EvaluationContextImpl(sharedArtifacts, (heap) => new RuntimeOpImpl(heap), runtime);
}

export class JitRenderDelegate implements RenderDelegate {
  static readonly isEager = false;
  static style = 'jit';

  protected registry: TestJitRegistry;
  protected resolver: TestJitRuntimeResolver;

  private plugins: ASTPluginBuilder[] = [];
  private _context: Nullable<EvaluationContext> = null;
  private self: Nullable<Reference> = null;
  private doc: SimpleDocument;
  private env: EnvironmentDelegate;

  constructor({
    doc,
    env,
    resolver = (registry) => new TestJitRuntimeResolver(registry),
  }: RenderDelegateOptions = {}) {
    this.registry = new TestJitRegistry();
    this.resolver = resolver(this.registry);
    this.doc = castToSimple(doc ?? document);
    this.env = assign({}, env ?? BaseEnv);
    this.registry.register('modifier', 'on', on);
    this.registry.register('helper', 'fn', fn);
    this.registry.register('helper', 'hash', hash);
    this.registry.register('helper', 'array', array);
    this.registry.register('helper', 'get', get);
    this.registry.register('helper', 'concat', concat);
  }

  get context(): EvaluationContext {
    if (this._context === null) {
      this._context = JitDelegateContext(this.doc, this.resolver, this.env);
    }

    return this._context;
  }

  getCapturedRenderTree(): CapturedRenderNode[] {
    return expect(
      this.context.env.debugRenderTree,
      'Attempted to capture the DebugRenderTree during tests, but it was not created. Did you enable it in the environment?'
    ).capture();
  }

  getInitialElement(): SimpleElement {
    if (isBrowserTestDocument(this.doc)) {
      return castToSimple(castToBrowser(this.doc).getElementById('qunit-fixture')!);
    } else {
      return this.createElement('div');
    }
  }

  createElement(tagName: string): SimpleElement {
    return this.doc.createElement(tagName);
  }

  createTextNode(content: string): SimpleText {
    return this.doc.createTextNode(content);
  }

  createElementNS(namespace: ElementNamespace, tagName: string): SimpleElement {
    return this.doc.createElementNS(namespace, tagName);
  }

  createDocumentFragment(): SimpleDocumentFragment {
    return this.doc.createDocumentFragment();
  }

  createCurriedComponent(name: string): CurriedValue | null {
    return componentHelper(this.registry, name, this.context.program.constants);
  }

  registerPlugin(plugin: ASTPluginBuilder): void {
    this.plugins.push(plugin);
  }

  registerComponent<K extends 'TemplateOnly' | 'Glimmer', L extends ComponentKind>(
    type: K,
    _testType: L,
    name: string,
    layout: string,
    Class?: ComponentTypes[K]
  ): void;
  registerComponent<K extends 'Curly' | 'Dynamic', L extends ComponentKind>(
    type: K,
    _testType: L,
    name: string,
    layout: Nullable<string>,
    Class?: ComponentTypes[K]
  ): void;
  registerComponent<K extends ComponentKind, L extends ComponentKind>(
    type: K,
    _testType: L,
    name: string,
    layout: Nullable<string>,
    Class?: ComponentTypes[K]
  ) {
    registerComponent(this.registry, type, name, layout, Class);
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    registerModifier(this.registry, name, ModifierClass);
  }

  registerHelper(name: string, helper: UserHelper): void {
    registerHelper(this.registry, name, helper);
  }

  registerInternalHelper(name: string, helper: Helper) {
    registerInternalHelper(this.registry, name, helper);
  }

  getElementBuilder(env: Environment, cursor: Cursor): TreeBuilder {
    return clientBuilder(env, cursor);
  }

  getSelf(_env: Environment, context: unknown): Reference {
    if (!this.self) {
      this.self = createConstRef(context, 'this');
    }

    return this.self;
  }

  compileTemplate(template: string): HandleResult {
    let compiled = preprocess(template, this.precompileOptions);

    return unwrapTemplate(compiled).asLayout().compile(this.context);
  }

  renderTemplate(template: string, context: Dict, element: SimpleElement): RenderResult {
    let cursor = { element, nextSibling: null };

    let { env } = this.context;

    return renderTemplate(
      template,
      this.context,
      this.getSelf(env, context),
      this.getElementBuilder(env, cursor),
      this.precompileOptions
    );
  }

  renderComponent(
    component: object,
    args: Record<string, unknown>,
    element: SimpleElement,
    dynamicScope?: DynamicScope
  ): RenderResult {
    // GXT-mode bypass: under GXT_MODE, `@ember/template-compiler#template`
    // attaches a GXT-compiled template (created by the GXT runtime
    // compile pipeline) to the returned component via
    // `setComponentTemplate`. That template's `asLayout().compile()`
    // returns an `{ handle, symbolTable }` object — NOT the numeric
    // handle that Glimmer's `unwrapHandle` expects — so dispatching it
    // through the Glimmer opcode runtime crashes with
    // `Cannot read properties of undefined (reading '0')` inside
    // `unwrapHandle` (it falls into the `errors[0]` branch).
    //
    // Detect a GXT template and dispatch through the GXT renderer
    // (`factory(owner).render(ctx, element)`) instead. This is the
    // same shape the rehydration GXT delegate uses (see
    // `gxt-delegate.ts#compileAndRender`), reduced to the minimum we
    // need for `jitSuite` keyword-helper tests where the component is
    // a `templateOnly()` with a GXT template already attached.
    if (__GXT_MODE__) {
      const gxtFactory = getComponentTemplate(component) as unknown as
        | (((owner?: unknown) => GxtRenderableTemplate) & { __gxtCompiled?: boolean })
        | undefined;
      if (gxtFactory && gxtFactory.__gxtCompiled === true) {
        return this.renderGxtComponent(gxtFactory, args, element, component);
      }
    }

    let cursor = { element, nextSibling: null };
    let { env } = this.context;
    let builder = this.getElementBuilder(env, cursor);
    let iterator = renderComponent(this.context, builder, {}, component, args, dynamicScope);

    return renderSync(env, iterator);
  }

  /**
   * GXT-mode render path for components produced by
   * `@ember/template-compiler#template` under `__GXT_MODE__`. The
   * compiled template's `render(ctx, parentEl)` is invoked directly
   * against the test fixture element, mirroring what the GXT
   * rehydration delegate does in its `compileAndRender` helper.
   *
   * Returns a minimal `RenderResult` stand-in — the keyword-helper
   * tests only call `assertHTML(...)` against the fixture after
   * render and do not rely on the `RenderResult` methods, but we
   * still expose `rerender` / `destroy` no-ops so callers that
   * incidentally invoke them don't crash.
   */
  private renderGxtComponent(
    factory: (owner?: unknown) => GxtRenderableTemplate,
    args: Record<string, unknown>,
    element: SimpleElement,
    component?: object
  ): RenderResult {
    const tmpl = factory();
    // Keyword-helper "no eval and no scope" tests pass a `GlimmerishComponent`
    // subclass as `component:` to `template(...)`. Their templates reference
    // `this.a` / `this.b` etc. — instance fields of that class. The GXT
    // template's `render(ctx, ...)` resolves bare `this.X` against the
    // provided ctx object, so we need to use a real component instance —
    // not a bare `Object.create(null)` — as the rendering context.
    //
    // We instantiate any function-typed component (i.e. a class) directly
    // here. We pass `(undefined owner, args)` matching `GlimmerishComponent`'s
    // signature so `this.args` is populated; non-Glimmerish classes that
    // happen to be function-typed will ignore the extra ctor args. For
    // non-class components (e.g. `templateOnly()` returns an instance,
    // typeof 'object'), fall back to the previous bare-object ctx.
    let ctx: Record<string, unknown>;
    if (typeof component === 'function') {
      try {
        const Ctor = component as new (owner: unknown, args: Record<string, unknown>) => Record<
          string,
          unknown
        >;
        ctx = new Ctor(undefined, args ?? {});
      } catch (e) {
        // Surface the construction failure to the test so it isn't silently
        // swallowed into "rendered nothing" confusion. Re-throw — the
        // outer `run()` will mark the test as errored which is more useful
        // than a misleading assertion diff.
        throw e;
      }
    } else {
      ctx = Object.create(null);
      ctx['args'] = args ?? {};
    }
    tmpl.render(ctx, element as unknown as Element);

    // RenderResult is a class-typed value in `@glimmer/interfaces`; we
    // expose only the subset the test harness actually touches (env +
    // rerender + destroy). Casting through `unknown` is intentional:
    // GXT does not produce a real Glimmer RenderResult, and the test
    // harness never inspects opcode-runtime-specific fields here.
    const stub = {
      env: this.context.env,
      drop: { willDestroy() {}, didDestroy() {} },
      destroy() {},
      rerender() {},
      handleException() {},
    };
    return stub as unknown as RenderResult;
  }

  private get precompileOptions(): PrecompileOptions {
    return {
      plugins: {
        ast: this.plugins,
      },
    };
  }
}

function isBrowserTestDocument(doc: SimpleDocument | Document): doc is Document {
  return 'getElementById' in doc && doc.getElementById('qunit-fixture') !== null;
}
