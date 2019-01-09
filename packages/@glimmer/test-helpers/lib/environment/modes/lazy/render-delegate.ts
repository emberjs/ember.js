import { Cursor, Dict, Environment, RenderResult } from '@glimmer/interfaces';
import { UpdatableReference } from '@glimmer/object-reference';
import { PathReference } from '@glimmer/reference';
import { clientBuilder, ElementBuilder } from '@glimmer/runtime';
import { SimpleElement } from '@simple-dom/interface';
import { ComponentKind, ComponentTypes } from '../../../interfaces';
import { registerComponent, renderTemplate } from '../../../render';
import RenderDelegate from '../../../render-delegate';
import { UserHelper } from '../../helper';
import { TestModifierConstructor } from '../../modifier';
import LazyTestEnvironment from './environment';

declare const module: any;

export default class LazyRenderDelegate implements RenderDelegate {
  static readonly isEager = false;

  constructor(protected env: LazyTestEnvironment = new LazyTestEnvironment()) {}

  resetEnv() {
    this.env = new LazyTestEnvironment();
  }

  getInitialElement(): SimpleElement {
    if (typeof module !== 'undefined' && module.exports) {
      return this.env.getAppendOperations().createElement('div');
    }

    return document.getElementById('qunit-fixture')! as SimpleElement;
  }

  createElement(tagName: string): SimpleElement {
    return this.env.getAppendOperations().createElement(tagName);
  }

  registerComponent<K extends ComponentKind, L extends ComponentKind>(
    type: K,
    _testType: L,
    name: string,
    layout: string,
    Class?: ComponentTypes[K]
  ) {
    registerComponent(this.env, type, name, layout, Class);
  }

  registerModifier(name: string, ModifierClass: TestModifierConstructor): void {
    this.env.registerModifier(name, ModifierClass);
  }

  registerHelper(name: string, helper: UserHelper): void {
    this.env.registerHelper(name, helper);
  }

  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder {
    return clientBuilder(env, cursor);
  }

  getSelf(context: unknown): PathReference<unknown> {
    return new UpdatableReference(context);
  }

  renderTemplate(template: string, context: Dict<unknown>, element: SimpleElement): RenderResult {
    let { env } = this;
    let cursor = { element, nextSibling: null };
    return renderTemplate(
      template,
      env,
      this.getSelf(context),
      this.getElementBuilder(env, cursor)
    );
  }
}
