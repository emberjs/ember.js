import { PrecompileOptions } from '@glimmer/compiler';
import {
  Cursor,
  Dict,
  ElementBuilder,
  Environment,
  RenderResult,
  Option,
  Helper,
} from '@glimmer/interfaces';
import { serializeBuilder } from '@glimmer/node';
import { ASTPluginBuilder } from '@glimmer/syntax';
import { createConstRef, Reference } from '@glimmer/reference';
import createHTMLDocument from '@simple-dom/document';
import {
  SimpleDocument,
  SimpleElement,
  SimpleNode,
  SimpleText,
  ElementNamespace,
  SimpleDocumentFragment,
} from '@simple-dom/interface';
import { ComponentKind } from '../../components';
import { replaceHTML, toInnerHTML } from '../../dom/simple-utils';
import { UserHelper } from '../../helpers';
import { TestModifierConstructor } from '../../modifiers';
import RenderDelegate, { RenderDelegateOptions } from '../../render-delegate';
import { JitDelegateContext, JitTestDelegateContext } from '../jit/delegate';
import {
  registerComponent,
  registerHelper,
  registerModifier,
  registerPartial,
  registerInternalHelper,
} from '../jit/register';
import { TestJitRegistry } from '../jit/registry';
import { renderTemplate } from '../jit/render';
import TestJitRuntimeResolver from '../jit/resolver';
import { debugRehydration, DebugRehydrationBuilder } from './builder';
import { BaseEnv } from '../env';
import { assign, cast } from '@glimmer/util';

export interface RehydrationStats {
  clearedNodes: SimpleNode[];
}

export class RehydrationDelegate implements RenderDelegate {
  static readonly isEager = false;
  static readonly style = 'rehydration';

  private plugins: ASTPluginBuilder[] = [];

  public clientEnv: JitTestDelegateContext;
  public serverEnv: JitTestDelegateContext;

  private clientResolver: TestJitRuntimeResolver;
  private serverResolver: TestJitRuntimeResolver;

  private clientRegistry: TestJitRegistry;
  private serverRegistry: TestJitRegistry;

  public clientDoc: SimpleDocument;
  public serverDoc: SimpleDocument;

  public rehydrationStats!: RehydrationStats;

  private self: Option<Reference> = null;

  constructor(options?: RenderDelegateOptions) {
    let delegate = assign(options?.env ?? {}, BaseEnv);

    this.clientDoc = cast(document).simple;
    this.clientResolver = new TestJitRuntimeResolver();
    this.clientRegistry = this.clientResolver.registry;
    this.clientEnv = JitDelegateContext(
      this.clientDoc,
      this.clientResolver,
      this.clientRegistry,
      delegate
    );

    this.serverDoc = createHTMLDocument();
    this.serverResolver = new TestJitRuntimeResolver();
    this.serverRegistry = this.serverResolver.registry;
    this.serverEnv = JitDelegateContext(
      this.serverDoc,
      this.serverResolver,
      this.serverRegistry,
      delegate
    );
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
    let { env } = this.serverEnv.runtime;

    // Emulate server-side render
    renderTemplate(
      template,
      this.serverEnv,
      this.getSelf(env, context),
      this.getElementBuilder(env, cursor),
      this.precompileOptions
    );

    takeSnapshot();
    return this.serialize(element);
  }

  getSelf(_env: Environment, context: unknown): Reference {
    if (!this.self) {
      this.self = createConstRef(context, 'this');
    }

    return this.self;
  }

  serialize(element: SimpleElement): string {
    return toInnerHTML(element);
  }

  renderClientSide(template: string, context: Dict<unknown>, element: SimpleElement): RenderResult {
    let env = this.clientEnv.runtime.env;
    this.self = null;

    // Client-side rehydration
    let cursor = { element, nextSibling: null };
    let builder = this.getElementBuilder(env, cursor) as DebugRehydrationBuilder;
    let result = renderTemplate(
      template,
      this.clientEnv,
      this.getSelf(env, context),
      builder,
      this.precompileOptions
    );

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

  registerPlugin(plugin: ASTPluginBuilder): void {
    this.plugins.push(plugin);
  }

  registerComponent(type: ComponentKind, _testType: string, name: string, layout: string): void {
    registerComponent(this.clientRegistry, type, name, layout);
    registerComponent(this.serverRegistry, type, name, layout);
  }

  registerHelper(name: string, helper: UserHelper): void {
    registerHelper(this.clientRegistry, name, helper);
    registerHelper(this.serverRegistry, name, helper);
  }

  registerInternalHelper(name: string, helper: Helper) {
    registerInternalHelper(this.clientRegistry, name, helper);
    registerInternalHelper(this.serverRegistry, name, helper);
  }

  registerPartial(name: string, content: string) {
    registerPartial(this.clientRegistry, name, content);
    registerPartial(this.serverRegistry, name, content);
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    registerModifier(this.clientRegistry, name, ModifierClass);
    registerModifier(this.serverRegistry, name, ModifierClass);
  }

  private get precompileOptions(): PrecompileOptions {
    return {
      plugins: {
        ast: this.plugins,
      },
    };
  }
}

export function qunitFixture(): SimpleElement {
  return cast(document).getElementById('qunit-fixture');
}
