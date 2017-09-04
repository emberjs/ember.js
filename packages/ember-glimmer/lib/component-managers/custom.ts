import { assert } from 'ember-debug';
import AbstractManager from './abstract';
import {
  CurlyComponentLayoutCompiler
} from './curly';
import { ComponentManager } from '@glimmer/runtime';
import ComponentStateBucket from '../utils/curly-component-state-bucket';

/**
  Wrapper class for custom component managers as per
  Custom Components RFC.

  When defining a custom component manager, the following
  methods are required:

  - `create`
  - `getSelf`
  - `update`

  `layoutFor` method is not required to be implemented and
  mirrors the behaviour of curly components.
  @private
  @class CustomManager
*/
export default class CustomManager extends AbstractManager<ComponentStateBucket> {
  private _manager: ComponentManager<ComponentStateBucket>;

  constructor(manager) {
    super();

    this._manager = manager;

    assert('You must implement `create` method.', this._manager.create !== undefined);
    assert('You must implement `getSelf` method.', this._manager.getSelf !== undefined);
    assert('You must implement `update` method.', this._manager.update !== undefined);
  }

  create(environment, definition, args, dynamicScope, callerSelfRef, hasBlock) {
    return this._manager.create(environment, definition, args, dynamicScope, callerSelfRef, hasBlock);
  }

  getSelf({ component }) {
    return this._manager.getSelf(component);
  }

  update(bucket, dynamicScope) {
    return this._manager.update(bucket, dynamicScope);
  }

  layoutFor(definition, bucket, env) {
    if (this._manager.layoutFor) {
      return this._manager.layoutFor(definition, bucket, env);
    }

    let template = definition.template;
    if (!template) {
      let { component } = bucket;
      template = this.templateFor(component, env);
    }
    return env.getCompiledBlock(CurlyComponentLayoutCompiler, template);
  }

  didCreate(component) {
    if (this._manager.didCreate !== undefined) {
      this._manager.didCreate(component);
    } else {
      super.didCreate(component);
    }
  }

  didCreateElement(component, element, operations) {
    if (this._manager.didCreateElement !== undefined) {
      this._manager.didCreateElement(component, element, operations);
    } else {
      super.didCreateElement(component, element, operations);
    }
  }

  didUpdate(state) {
    if (this._manager.didUpdate !== undefined) {
      this._manager.didUpdate(state);
    } else {
      super.didUpdate(state);
    }
  }

  getDestructor(state) {
    if (this._manager.getDestructor !== undefined) {
      this._manager.getDestructor(state);
    } else {
      return state;
    }
  }
}
