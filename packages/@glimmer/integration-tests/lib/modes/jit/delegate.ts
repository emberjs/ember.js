import { PrecompileOptions } from '@glimmer/syntax';
import {
  CapturedRenderNode,
  ComponentDefinition,
  Cursor,
  Dict,
  DynamicScope,
  ElementBuilder,
  Environment,
  HandleResult,
  Helper,
  Option,
  RenderResult,
  RuntimeContext,
  SyntaxCompilationContext,
} from '@glimmer/interfaces';
import { syntaxCompilationContext } from '@glimmer/opcode-compiler';
import { artifacts } from '@glimmer/program';
import { createConstRef, Reference } from '@glimmer/reference';
import {
  clientBuilder,
  CurriedComponentDefinition,
  EnvironmentDelegate,
  getDynamicVar,
  renderComponent,
  renderSync,
  runtimeContext,
} from '@glimmer/runtime';
import { ASTPluginBuilder } from '@glimmer/syntax';
import { assign, castToBrowser, castToSimple, expect, unwrapTemplate } from '@glimmer/util';
import {
  ElementNamespace,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleText,
} from '@simple-dom/interface';
import { preprocess } from '../../compile';
import { TestMacros } from '../../compile/macros';
import { ComponentKind, ComponentTypes } from '../../components';
import { UserHelper } from '../../helpers';
import { TestModifierConstructor } from '../../modifiers';
import RenderDelegate, { RenderDelegateOptions } from '../../render-delegate';
import { BaseEnv } from '../env';
import JitCompileTimeLookup from './compilation-context';
import {
  componentHelper,
  registerComponent,
  registerHelper,
  registerInternalHelper,
  registerModifier,
  registerPartial,
} from './register';
import { TestJitRegistry } from './registry';
import { renderTemplate } from './render';
import { TestJitRuntimeResolver } from './resolver';

export interface JitTestDelegateContext {
  runtime: RuntimeContext;
  syntax: SyntaxCompilationContext;
}

export function JitDelegateContext(
  doc: SimpleDocument,
  resolver: TestJitRuntimeResolver,
  env: EnvironmentDelegate
): JitTestDelegateContext {
  let sharedArtifacts = artifacts();
  let context = syntaxCompilationContext(
    sharedArtifacts,
    new JitCompileTimeLookup(resolver),
    new TestMacros()
  );
  let runtime = runtimeContext({ document: doc }, env, sharedArtifacts, resolver);
  return { runtime, syntax: context };
}

export class JitRenderDelegate implements RenderDelegate {
  static readonly isEager = false;
  static style = 'jit';

  protected registry = new TestJitRegistry();
  protected resolver: TestJitRuntimeResolver = new TestJitRuntimeResolver(this.registry);

  private plugins: ASTPluginBuilder[] = [];
  private _context: JitTestDelegateContext | null = null;
  private self: Option<Reference> = null;
  private doc: SimpleDocument;
  private env: EnvironmentDelegate;

  constructor(options?: RenderDelegateOptions) {
    this.doc = castToSimple(options?.doc ?? document);
    this.env = assign({}, options?.env ?? BaseEnv);
    registerInternalHelper(this.registry, '-get-dynamic-var', getDynamicVar);
  }

  get context(): JitTestDelegateContext {
    if (this._context === null) {
      this._context = JitDelegateContext(this.doc, this.resolver, this.env);
    }

    return this._context;
  }

  getCapturedRenderTree(): CapturedRenderNode[] {
    return expect(
      this.context.runtime.env.debugRenderTree,
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

  createCurriedComponent(name: string): Option<CurriedComponentDefinition> {
    return componentHelper(this.resolver, this.registry, name);
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
    layout: Option<string>,
    Class?: ComponentTypes[K]
  ): void;
  registerComponent<K extends ComponentKind, L extends ComponentKind>(
    type: K,
    _testType: L,
    name: string,
    layout: Option<string>,
    Class?: ComponentTypes[K]
  ) {
    registerComponent(this.registry, type, name, layout!, Class);
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

  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder {
    return clientBuilder(env, cursor);
  }

  registerPartial(name: string, content: string) {
    registerPartial(this.registry, name, content);
  }

  getSelf(_env: Environment, context: unknown): Reference {
    if (!this.self) {
      this.self = createConstRef(context, 'this');
    }

    return this.self;
  }

  compileTemplate(template: string): HandleResult {
    let compiled = preprocess(template, this.precompileOptions);

    return unwrapTemplate(compiled).asLayout().compile(this.context.syntax);
  }

  renderTemplate(template: string, context: Dict<unknown>, element: SimpleElement): RenderResult {
    let cursor = { element, nextSibling: null };

    let { env } = this.context.runtime;

    return renderTemplate(
      template,
      this.context,
      this.getSelf(env, context),
      this.getElementBuilder(env, cursor),
      this.precompileOptions
    );
  }

  renderComponent(
    name: string,
    args: Dict<Reference<unknown>>,
    element: SimpleElement,
    dynamicScope?: DynamicScope
  ): RenderResult {
    let cursor = { element, nextSibling: null };
    let { syntax, runtime } = this.context;
    let builder = this.getElementBuilder(runtime.env, cursor);

    let { handle, compilable } = this.registry.lookupCompileTimeComponent(name)!;
    let component = this.registry.resolve<ComponentDefinition>(handle);

    let iterator = renderComponent(
      runtime,
      builder,
      syntax,
      component,
      compilable!,
      args,
      dynamicScope
    );

    return renderSync(runtime.env, iterator);
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
  return !!((doc as any).getElementById && (doc as any).getElementById('qunit-fixture'));
}
