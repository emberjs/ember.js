import { Cursor, Dict, Environment, RenderResult } from '@glimmer/interfaces';
import { UpdatableReference } from '@glimmer/object-reference';
import { PathReference } from '@glimmer/reference';
import { clientBuilder, ElementBuilder, JitRuntime, getDynamicVar } from '@glimmer/runtime';
import { SimpleElement, SimpleDocument } from '@simple-dom/interface';
import { ComponentKind, ComponentTypes } from '../../../interfaces';
import { renderTemplate, JitTestDelegateContext } from '../../../render';
import RenderDelegate from '../../../render-delegate';
import { UserHelper } from '../../helper';
import { TestModifierConstructor } from '../../modifier';
import LazyRuntimeResolver from './runtime-resolver';
import { BasicComponentFactory } from '../../components/basic';
import { EmberishCurlyComponentFactory, EmberishGlimmerComponentFactory } from '../../components';
import TestMacros from '../../macros';
import { TestLazyCompilationContext } from './compilation-context';
import {
  registerStaticTaglessComponent,
  registerEmberishCurlyComponent,
  registerEmberishGlimmerComponent,
  registerModifier,
  registerHelper,
  registerInternalHelper,
} from './register';

declare const module: any;

export default class LazyRenderDelegate implements RenderDelegate {
  static readonly isEager = false;

  private resolver: LazyRuntimeResolver = new LazyRuntimeResolver();
  private context: JitTestDelegateContext;

  constructor(private doc: SimpleDocument = document as SimpleDocument) {
    this.context = this.getContext(this.resolver);
  }

  getContext(resolver: LazyRuntimeResolver): JitTestDelegateContext {
    return JitDelegateContext(this.doc, resolver);
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
          this.resolver,
          name,
          Class as BasicComponentFactory,
          layout
        );
      case 'Curly':
      case 'Dynamic':
        return registerEmberishCurlyComponent(
          this.resolver,
          name,
          Class as EmberishCurlyComponentFactory,
          layout
        );
      case 'Glimmer':
        return registerEmberishGlimmerComponent(
          this.resolver,
          name,
          Class as EmberishGlimmerComponentFactory,
          layout
        );
    }
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    registerModifier(this.resolver, name, ModifierClass);
  }

  registerHelper(name: string, helper: UserHelper): void {
    registerHelper(this.resolver, name, helper);
  }

  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder {
    return clientBuilder(env, cursor);
  }

  getSelf(context: unknown): PathReference<unknown> {
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

export function JitDelegateContext(doc: SimpleDocument, resolver: LazyRuntimeResolver) {
  registerInternalHelper(resolver, '-get-dynamic-var', getDynamicVar);
  let context = new TestLazyCompilationContext(resolver);
  let runtime = JitRuntime(doc, context.program(), resolver);
  let syntax = { program: context, macros: new TestMacros() };
  return { runtime, syntax };
}
