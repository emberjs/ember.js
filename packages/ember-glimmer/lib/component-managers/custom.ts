import { get } from 'ember-metal';
import { OWNER } from 'ember-utils';
import { DEBUG } from 'ember-env-flags';
import { assert } from 'ember-debug';
import AbstractManager from './abstract';
import {
  CurlyComponentLayoutCompiler
} from './curly';
import {
  Arguments,
  CompiledDynamicProgram,
  ComponentDefinition,
  ComponentManager,
  DynamicScope,
  ElementOperations
} from '@glimmer/runtime';
import ComponentStateBucket, { Component } from '../utils/curly-component-state-bucket';
import { ComponentCapabilities } from './capabilities';
import { Destroyable, Opaque } from '@glimmer/util';
import { Option } from '@glimmer/interfaces';
import Environment from '../environment';
import { VersionedPathReference } from '@glimmer/reference';
import { privatize as P } from 'container';
import { OwnedTemplate } from '../template';

const DEFAULT_LAYOUT = P`template:components/-default`;

interface CustomComponentDefinition extends ComponentDefinition<ComponentStateBucket> {
  template: OwnedTemplate;
  args: Arguments | undefined;
}

/**
  Wrapper class for custom component managers as per
  Custom Components RFC, http://bit.ly/2AlScAb.

  When defining a custom component manager, the following
  methods are required:

  - `create`
  - `getSelf`
  - `update`

  `layoutFor`/`templateFor` mirror the behaviour of curly components.
  `didCreate`, `didUpdate`, `getDestructor` are optional methods which
  could be overriden but by default are no-ops.

  @private
  @class CustomManager
*/
export default class CustomManager extends AbstractManager<ComponentStateBucket> {
  private _manager: ComponentManager<ComponentStateBucket>;

  constructor(manager: ComponentManager<ComponentStateBucket>) {
    super();

    this._manager = manager;

    assert('You must implement `create` method.', this._manager.create !== undefined);
    assert('You must implement `getSelf` method.', this._manager.getSelf !== undefined);
    assert('You must implement `update` method.', this._manager.update !== undefined);
  }

  create(environment: Environment, definition: ComponentDefinition<ComponentStateBucket>, args: Arguments, dynamicScope: DynamicScope, callerSelfRef: VersionedPathReference<Opaque>, hasBlock: boolean) {
    if (DEBUG) {
      this._pushToDebugStack(`component:${definition.name}`, environment);
    }

    return this._manager.create(environment, definition, args, dynamicScope, callerSelfRef, hasBlock);
  }

  getCapabilities(state: ComponentStateBucket): ComponentCapabilities {
    return state.capabilities;
  }

  getSelf(state: ComponentStateBucket) {
    return this._manager.getSelf(state);
  }

  update(state: ComponentStateBucket, dynamicScope: DynamicScope): void {
    let { component, environment } = state;

    if (DEBUG) {
       this._pushToDebugStack(component._debugContainerKey, environment);
    }

    this._manager.update(state, dynamicScope);
  }

  layoutFor(definition: CustomComponentDefinition, state: ComponentStateBucket, env: Environment): CompiledDynamicProgram {
    if (this._manager.layoutFor) {
      return this._manager.layoutFor(definition, state, env);
    }

    let template = definition.template;
    if (!template) {
      template = this.templateFor(state.component, env);
    }
    return env.getCompiledBlock(CurlyComponentLayoutCompiler, template);
  }

  templateFor(component: Component, env: Environment): OwnedTemplate {
    let Template = get(component, 'layout');
    let owner = component[OWNER];
    if (Template) {
      return env.getTemplate(Template, owner);
    }
    let layoutName = get(component, 'layoutName');
    if (layoutName) {
      let template = owner.lookup('template:' + layoutName);
      if (template) {
        return template;
      }
    }
    return owner.lookup(DEFAULT_LAYOUT);
  }

  didCreate(state: ComponentStateBucket): void {
    if (this._manager.didCreate !== undefined) {
      this._manager.didCreate(state);
    } else {
      super.didCreate(state);
    }
  }

  didCreateElement(state: ComponentStateBucket, element: Element, operations: ElementOperations): void {
    if (this._manager.didCreateElement !== undefined) {
      this._manager.didCreateElement(state, element, operations);
    } else {
      super.didCreateElement(state, element, operations);
    }
  }

  didUpdate(state: ComponentStateBucket): void {
    if (this._manager.didUpdate !== undefined) {
      this._manager.didUpdate(state);
    } else {
      super.didUpdate(state);
    }
  }

  didUpdateLayout(state: ComponentStateBucket): void {
    state.finalize();

    if (DEBUG) {
      this.debugStack.pop();
    }
  }

  getDestructor(state: ComponentStateBucket): Option<Destroyable> {
    if (this._manager.getDestructor !== undefined) {
      return this._manager.getDestructor(state);
    }

    return state;
  }
}
