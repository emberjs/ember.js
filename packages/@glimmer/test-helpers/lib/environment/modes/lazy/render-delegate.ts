import { Dict, Opaque } from '@glimmer/util';
import { Simple } from '@glimmer/interfaces';
import { RenderResult } from '@glimmer/runtime';
import { UpdatableReference } from '@glimmer/object-reference';

import LazyTestEnvironment from './environment';
import { UserHelper } from '../../helper';
import RenderDelegate from '../../../render-delegate';
import { TestDynamicScope } from '../../../environment';
import { ComponentTypes, ComponentKind, registerComponent, renderTemplate } from '../../../render-test';

export default class LazyRenderDelegate implements RenderDelegate {
  constructor(protected env: LazyTestEnvironment = new LazyTestEnvironment()) {}

  resetEnv() {
    this.env = new LazyTestEnvironment();
  }

  getInitialElement(): HTMLElement {
    return this.env.getAppendOperations().createElement('div') as HTMLElement;
  }

  registerComponent<K extends ComponentKind, L extends ComponentKind>(type: K, _testType: L, name: string, layout: string, Class?: ComponentTypes[K]) {
    registerComponent(this.env, type, name, layout, Class);
  }

  registerHelper(name: string, helper: UserHelper): void {
    this.env.registerHelper(name, helper);
  }

  renderTemplate(template: string, context: Dict<Opaque>, element: Simple.Element): RenderResult {
    let { env } = this;
    return renderTemplate(template, {
      env,
      self: new UpdatableReference(context),
      cursor: { element, nextSibling: null },
      dynamicScope: new TestDynamicScope()
    });
  }
}
