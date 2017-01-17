/**
@module ember
@submodule ember-glimmer
*/
import {
  ComponentDefinition
} from '@glimmer/runtime';
import { UNDEFINED_REFERENCE } from '@glimmer/reference';
import { assert, runInDebug } from 'ember-metal';
import { RootReference } from '../utils/references';
import { generateControllerFactory } from 'ember-routing';
import { OutletLayoutCompiler } from './outlet';
import { FACTORY_FOR } from 'container';
import AbstractManager from './abstract-manager';

/**
  The `{{mount}}` helper lets you embed a routeless engine in a template.
  Mounting an engine will cause an instance to be booted and its `application`
  template to be rendered.

  For example, the following template mounts the `ember-chat` engine:

  ```handlebars
  {{! application.hbs }}
  {{mount "ember-chat"}}
  ```

  Currently, the engine name is the only argument that can be passed to
  `{{mount}}`.

  @method mount
  @for Ember.Templates.helpers
  @category ember-application-engines
  @public
*/
export function mountMacro(path, params, hash, builder) {
  assert(
    'You can only pass a single argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.',
    params.length === 1 && hash === null
  );

  let name = params[0];

  assert(
    'The first argument of {{mount}} must be quoted, e.g. {{mount "chat-engine"}}.',
    typeof name === 'string'
  );

  assert(
    `You used \`{{mount '${name}'}}\`, but the engine '${name}' can not be found.`,
    builder.env.owner.hasRegistration(`engine:${name}`)
  );

  builder.component.static(new MountDefinition(name, builder.env), [params, hash, null, null], builder.symbolTable);
  return true;
}

class MountManager extends AbstractManager {
  prepareArgs(definition, args) {
    return args;
  }

  create(environment, { name, env }, args, dynamicScope) {
    runInDebug(() => this._pushEngineToDebugStack(`engine:${name}`, env));

    dynamicScope.outletState = UNDEFINED_REFERENCE;

    let engine = env.owner.buildChildEngineInstance(name);

    engine.boot();

    return { engine };
  }

  layoutFor(definition, { engine }, env) {
    let template = engine.lookup(`template:application`);
    return env.getCompiledBlock(OutletLayoutCompiler, template);
  }

  getSelf({ engine }) {
    let applicationFactory = engine[FACTORY_FOR](`controller:application`);
    let factory = applicationFactory || generateControllerFactory(engine, 'application');
    return new RootReference(factory.create());
  }

  getTag() {
    return null;
  }

  getDestructor({ engine }) {
    return engine;
  }

  didCreateElement() {}

  didRenderLayout() {
    runInDebug(() => this.debugStack.pop());
  }

  didCreate(state) {}
  update(state, args, dynamicScope) {}
  didUpdateLayout() {}
  didUpdate(state) {}
}

const MOUNT_MANAGER = new MountManager();

class MountDefinition extends ComponentDefinition {
  constructor(name, env) {
    super(name, MOUNT_MANAGER, null);
    this.env = env;
  }
}
