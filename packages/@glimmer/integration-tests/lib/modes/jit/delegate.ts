import {
  JitRuntimeContext,
  SyntaxCompilationContext,
  Environment,
  Cursor,
  ElementBuilder,
  Dict,
  RenderResult,
} from '@glimmer/interfaces';
import { SimpleDocument, SimpleElement } from '@simple-dom/interface';
import { TestJitRegistry } from './registry';
import { getDynamicVar, JitRuntime, clientBuilder } from '@glimmer/runtime';
import {
  registerInternalHelper,
  registerStaticTaglessComponent,
  registerEmberishCurlyComponent,
  registerEmberishGlimmerComponent,
  registerModifier,
  registerHelper,
} from './register';
import TestMacros from '../../compile/macros';
import { TestJitCompilationContext } from './compilation-context';
import TestJitRuntimeResolver from './resolver';
import RenderDelegate from '../../render-delegate';
import { ComponentKind, ComponentTypes } from '../../components';
import { BasicComponentFactory } from '../../components/basic';
import { EmberishCurlyComponentFactory } from '../../components/emberish-curly';
import { EmberishGlimmerComponentFactory } from '../../components/emberish-glimmer';
import { TestModifierConstructor } from '../../modifiers';
import { UserHelper } from '../../helpers';
import { VersionedPathReference, UpdatableReference } from '@glimmer/reference';
import { renderTemplate } from './render';

export interface JitTestDelegateContext {
  runtime: JitRuntimeContext;
  syntax: SyntaxCompilationContext;
}

export function JitDelegateContext(
  doc: SimpleDocument,
  resolver: TestJitRuntimeResolver,
  registry: TestJitRegistry
) {
  registerInternalHelper(registry, '-get-dynamic-var', getDynamicVar);
  let context = new TestJitCompilationContext(resolver, registry);
  let runtime = JitRuntime(doc, context.program(), resolver);
  let syntax = { program: context, macros: new TestMacros() };
  return { runtime, syntax };
}

export default class JitRenderDelegate implements RenderDelegate {
  static readonly isEager = false;

  private resolver: TestJitRuntimeResolver = new TestJitRuntimeResolver();
  private registry: TestJitRegistry = this.resolver.registry;
  private context: JitTestDelegateContext;

  constructor(private doc: SimpleDocument = document as SimpleDocument) {
    this.context = this.getContext();
  }

  getContext(): JitTestDelegateContext {
    return JitDelegateContext(this.doc, this.resolver, this.registry);
  }

  getInitialElement(): SimpleElement {
    if (typeof module !== 'undefined' && module.exports) {
      return this.doc.createElement('div');
    }

    return document.getElementById('qunit-fixture')! as SimpleElement;
  }

  createElement(tagName: string): SimpleElement {
    return this.doc.createElement(tagName);
  }

  registerComponent<K extends ComponentKind, L extends ComponentKind>(
    type: K,
    _testType: L,
    name: string,
    layout: string,
    Class?: ComponentTypes[K]
  ) {
    switch (type) {
      case 'Basic':
      case 'Fragment':
        return registerStaticTaglessComponent(
          this.registry,
          name,
          Class as BasicComponentFactory,
          layout
        );
      case 'Curly':
      case 'Dynamic':
        return registerEmberishCurlyComponent(
          this.registry,
          name,
          Class as EmberishCurlyComponentFactory,
          layout
        );
      case 'Glimmer':
        return registerEmberishGlimmerComponent(
          this.registry,
          name,
          Class as EmberishGlimmerComponentFactory,
          layout
        );
    }
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    registerModifier(this.registry, name, ModifierClass);
  }

  registerHelper(name: string, helper: UserHelper): void {
    registerHelper(this.registry, name, helper);
  }

  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder {
    return clientBuilder(env, cursor);
  }

  getSelf(context: unknown): VersionedPathReference {
    return new UpdatableReference(context);
  }

  renderTemplate(template: string, context: Dict<unknown>, element: SimpleElement): RenderResult {
    let cursor = { element, nextSibling: null };

    return renderTemplate(
      template,
      this.context,
      this.getSelf(context),
      this.getElementBuilder(this.context.runtime.env, cursor)
    );
  }
}
