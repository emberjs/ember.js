import { Cursor, Dict, ElementBuilder, Environment, RenderResult } from '@glimmer/interfaces';
import { serializeBuilder } from '@glimmer/node';
import { UpdatableReference } from '@glimmer/reference';
import createHTMLDocument from '@simple-dom/document';
import { SimpleDocument, SimpleElement, SimpleNode } from '@simple-dom/interface';
import { ComponentKind } from '../../components';
import { replaceHTML, toInnerHTML } from '../../dom/simple-utils';
import { UserHelper } from '../../helpers';
import { TestModifierConstructor } from '../../modifiers';
import RenderDelegate from '../../render-delegate';
import { JitDelegateContext, JitTestDelegateContext } from '../jit/delegate';
import { registerComponent, registerHelper, registerModifier } from '../jit/register';
import { TestJitRegistry } from '../jit/registry';
import { renderTemplate } from '../jit/render';
import TestJitRuntimeResolver from '../jit/resolver';
import { debugRehydration, DebugRehydrationBuilder } from './builder';

export interface RehydrationStats {
  clearedNodes: SimpleNode[];
}

export class RehydrationDelegate implements RenderDelegate {
  static readonly isEager = false;

  public clientEnv: JitTestDelegateContext;
  public serverEnv: JitTestDelegateContext;

  private clientResolver: TestJitRuntimeResolver;
  private serverResolver: TestJitRuntimeResolver;

  private clientRegistry: TestJitRegistry;
  private serverRegistry: TestJitRegistry;

  public clientDoc: SimpleDocument;
  public serverDoc: SimpleDocument;

  public rehydrationStats!: RehydrationStats;
  constructor() {
    this.clientDoc = document as SimpleDocument;
    this.clientResolver = new TestJitRuntimeResolver();
    this.clientRegistry = this.clientResolver.registry;
    this.clientEnv = JitDelegateContext(this.clientDoc, this.clientResolver, this.clientRegistry);

    this.serverDoc = createHTMLDocument();
    this.serverResolver = new TestJitRuntimeResolver();
    this.serverRegistry = this.serverResolver.registry;
    this.serverEnv = JitDelegateContext(this.serverDoc, this.serverResolver, this.serverRegistry);
  }

  getInitialElement(): SimpleElement {
    return this.clientDoc.createElement('div');
  }

  createElement(tagName: string): SimpleElement {
    return this.clientDoc.createElement(tagName);
  }

  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder {
    if (cursor.element instanceof Node) {
      return debugRehydration(env, cursor);
    }

    return serializeBuilder(env, cursor);
  }

  renderServerSide(
    template: string,
    context: Dict<unknown>,
    takeSnapshot: () => void,
    element: SimpleElement | undefined = undefined
  ): string {
    element = element || this.serverDoc.createElement('div');
    let cursor = { element, nextSibling: null };
    // Emulate server-side render
    renderTemplate(
      template,
      this.serverEnv,
      this.getSelf(context),
      this.getElementBuilder(this.serverEnv.runtime.env, cursor)
    );

    takeSnapshot();
    return this.serialize(element);
  }

  getSelf(context: unknown): UpdatableReference {
    return new UpdatableReference(context);
  }

  serialize(element: SimpleElement): string {
    return toInnerHTML(element);
  }

  renderClientSide(template: string, context: Dict<unknown>, element: SimpleElement): RenderResult {
    let env = this.clientEnv.runtime.env;
    // Client-side rehydration
    let cursor = { element, nextSibling: null };
    let builder = this.getElementBuilder(env, cursor) as DebugRehydrationBuilder;
    let result = renderTemplate(template, this.clientEnv, this.getSelf(context), builder);

    this.rehydrationStats = {
      clearedNodes: builder['clearedNodes'],
    };

    return result;
  }

  renderTemplate(
    template: string,
    context: Dict<unknown>,
    element: SimpleElement,
    snapshot: () => void
  ): RenderResult {
    let serialized = this.renderServerSide(template, context, snapshot);
    replaceHTML(element, serialized);
    qunitFixture().appendChild(element);
    return this.renderClientSide(template, context, element);
  }

  registerComponent(type: ComponentKind, _testType: string, name: string, layout: string): void {
    registerComponent(this.clientRegistry, type, name, layout);
    registerComponent(this.serverRegistry, type, name, layout);
  }

  registerHelper(name: string, helper: UserHelper): void {
    registerHelper(this.clientRegistry, name, helper);
    registerHelper(this.serverRegistry, name, helper);
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    registerModifier(this.clientRegistry, name, ModifierClass);
    registerModifier(this.serverRegistry, name, ModifierClass);
  }
}

export function qunitFixture(): SimpleElement {
  return document.getElementById('qunit-fixture') as SimpleElement;
}
