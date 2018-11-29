import { Dict, Opaque, expect } from '@glimmer/util';
import { Simple } from '@glimmer/interfaces';
import { RenderResult, clientBuilder, Environment, Cursor, ElementBuilder } from '@glimmer/runtime';
import { UpdatableReference } from '@glimmer/object-reference';
import { PathReference } from '@glimmer/reference';

import LazyTestEnvironment from './environment';
import { UserHelper } from '../../helper';
import RenderDelegate from '../../../render-delegate';
import {
  ComponentTypes,
  ComponentKind,
  registerComponent,
  renderTemplate,
} from '../../../render-test';
import { TestModifierConstructor } from '../../modifier';

declare const module: any;

export default class LazyRenderDelegate implements RenderDelegate {
  constructor(protected env: LazyTestEnvironment = new LazyTestEnvironment()) {}

  resetEnv() {
    this.env = new LazyTestEnvironment();
  }

  getInitialElement(): Simple.Element {
    if (typeof module !== 'undefined' && module.exports) {
      return this.env.getAppendOperations().createElement('div');
    }

    let fixture = expect(
      document.getElementById('qunit-fixture'),
      `expected to find an element with ID 'qunit-fixture' in the DOM`
    );

    return fixture as Simple.Element;
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

  getSelf(context: Opaque): PathReference<Opaque> {
    return new UpdatableReference(context);
  }

  renderTemplate(
    template: string,
    context: Dict<Opaque>,
    element: Element | Simple.Element
  ): RenderResult {
    let { env } = this;
    let cursor = { element, nextSibling: null } as Cursor;
    return renderTemplate(
      template,
      env,
      this.getSelf(context),
      this.getElementBuilder(env, cursor)
    );
  }
}
