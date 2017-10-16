import { Dict, Opaque } from '@glimmer/util';
import { Simple } from '@glimmer/interfaces';
import { RenderResult, clientBuilder, Environment, Cursor, ElementBuilder } from '@glimmer/runtime';
import { UpdatableReference, RootReference } from '@glimmer/object-reference';

import LazyTestEnvironment from './environment';
import { UserHelper } from '../../helper';
import RenderDelegate from '../../../render-delegate';
import { TestDynamicScope } from '../../../environment';
import { ComponentTypes, ComponentKind, registerComponent, renderTemplate } from '../../../render-test';
import { BasicReference } from '@glimmer/reference';

declare const module: any;

export default class LazyRenderDelegate implements RenderDelegate {
  constructor(protected env: LazyTestEnvironment = new LazyTestEnvironment()) { }

  resetEnv() {
    this.env = new LazyTestEnvironment();
  }

  getInitialElement(): HTMLElement {
    if (typeof module !== 'undefined' && module.exports) {
      return this.env.getAppendOperations().createElement('div') as HTMLElement;
    }

    return document.getElementById('qunit-fixture')!;
  }

  registerComponent<K extends ComponentKind, L extends ComponentKind>(type: K, _testType: L, name: string, layout: string, Class?: ComponentTypes[K]) {
    registerComponent(this.env, type, name, layout, Class);
  }

  registerHelper(name: string, helper: UserHelper): void {
    this.env.registerHelper(name, helper);
  }

  getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder {
    return clientBuilder(env, cursor);
  }

  getSelf(context: Opaque): BasicReference<Opaque> {
    return new UpdatableReference(context);
  }

  renderTemplate(template: string, context: Dict<Opaque>, element: Simple.Element): RenderResult {
    let { env } = this;
    let cursor = { element, nextSibling: null };
    return renderTemplate(template, {
      env,
      self: this.getSelf(context) as RootReference<Opaque>,
      builder: this.getElementBuilder(env, cursor),
      dynamicScope: new TestDynamicScope()
    });
  }
}
