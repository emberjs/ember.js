import { PrecompileOptions } from '@glimmer/compiler';
import {
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
import { assign, castToBrowser, castToSimple, unwrapTemplate } from '@glimmer/util';
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
import { EmberishCurlyComponentFactory } from '../../components/emberish-curly';
import { EmberishGlimmerComponentFactory } from '../../components/emberish-glimmer';
import { UserHelper } from '../../helpers';
import { TestModifierConstructor } from '../../modifiers';
import RenderDelegate, { RenderDelegateOptions } from '../../render-delegate';
import { BaseEnv } from '../env';
import JitCompileTimeLookup from './compilation-context';
import {
  componentHelper,
  registerEmberishCurlyComponent,
  registerEmberishGlimmerComponent,
  registerHelper,
  registerInternalHelper,
  registerModifier,
  registerPartial,
  registerTemplateOnlyComponent,
  registerTemplate,
} from './register';
import { TestJitRegistry } from './registry';
import { renderTemplate } from './render';
import TestJitRuntimeResolver from './resolver';

export interface JitTestDelegateContext {
  runtime: RuntimeContext;
  syntax: SyntaxCompilationContext;
}

export function JitDelegateContext(
  doc: SimpleDocument,
  resolver: TestJitRuntimeResolver,
  registry: TestJitRegistry,
  env: EnvironmentDelegate
): JitTestDelegateContext {
  registerInternalHelper(registry, '-get-dynamic-var', getDynamicVar);
  let sharedArtifacts = artifacts();
  let context = syntaxCompilationContext(
    sharedArtifacts,
    new JitCompileTimeLookup(resolver, registry),
    new TestMacros()
  );
  let runtime = runtimeContext({ document: doc }, env, sharedArtifacts, resolver);
  return { runtime, syntax: context };
}

export class JitRenderDelegate implements RenderDelegate {
  static readonly isEager = false;
  static style = 'jit';

  private plugins: ASTPluginBuilder[] = [];
  private resolver: TestJitRuntimeResolver = new TestJitRuntimeResolver();
  private registry: TestJitRegistry = this.resolver.registry;
  private context: JitTestDelegateContext;
  private self: Option<Reference> = null;
  private doc: SimpleDocument;
  private env: EnvironmentDelegate;

  constructor(options?: RenderDelegateOptions) {
    this.doc = options?.doc ?? castToSimple(document);
    this.env = assign(options?.env ?? {}, BaseEnv);
    this.context = this.getContext();
  }

  getContext(): JitTestDelegateContext {
    return JitDelegateContext(this.doc, this.resolver, this.registry, this.env);
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
    switch (type) {
      case 'TemplateOnly':
        return registerTemplateOnlyComponent(this.registry, name, layout!);
      case 'Curly':
      case 'Dynamic':
        return registerEmberishCurlyComponent(
          this.registry,
          name,
          (Class as any) as EmberishCurlyComponentFactory,
          layout
        );
      case 'Glimmer':
        return registerEmberishGlimmerComponent(
          this.registry,
          name,
          (Class as any) as EmberishGlimmerComponentFactory,
          layout!
        );
    }
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

  registerTemplate(name: string, content: string) {
    return registerTemplate(this.registry, name, content);
  }

  getSelf(_env: Environment, context: unknown): Reference {
    if (!this.self) {
      this.self = createConstRef(context, 'this');
    }

    return this.self;
  }

  compileTemplate(template: string): HandleResult {
    let compiled = preprocess(template, undefined, this.precompileOptions);

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
    dyanmicScope?: DynamicScope
  ): RenderResult {
    let cursor = { element, nextSibling: null };
    let { syntax, runtime } = this.context;
    let builder = this.getElementBuilder(runtime.env, cursor);

    let { handle, compilable } = this.registry.lookupCompileTimeComponent(name, null)!;
    let component = this.registry.resolve<ComponentDefinition>(handle);

    let iterator = renderComponent(
      runtime,
      builder,
      syntax,
      component,
      compilable!,
      args,
      dyanmicScope
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

function isBrowserTestDocument(doc: SimpleDocument): doc is SimpleDocument & Document {
  return !!((doc as any).getElementById && (doc as any).getElementById('qunit-fixture'));
}
