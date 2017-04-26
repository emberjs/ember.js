/**
@module ember
@submodule ember-glimmer
*/
import {
  ComponentDefinition
} from '@glimmer/runtime';
import { UNDEFINED_REFERENCE } from '@glimmer/reference';
import { assert } from 'ember-debug';
import { RootReference } from '../utils/references';
import { generateControllerFactory } from 'ember-routing';
import { OutletLayoutCompiler } from './outlet';
import AbstractManager from './abstract-manager';
import { DEBUG } from 'ember-env-flags';
import { EMBER_ENGINES_MOUNT_PARAMS } from 'ember/features';

function dynamicEngineFor(vm, symbolTable) {
  let env     = vm.env;
  let args    = vm.getArgs();
  let nameRef = args.positional.at(0);

  return new DynamicEngineReference({ nameRef, env, symbolTable });
}

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
  if (EMBER_ENGINES_MOUNT_PARAMS) {
    assert(
      'You can only pass a single positional argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.',
      params.length === 1
    );
  } else {
    assert(
      'You can only pass a single argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.',
      params.length === 1 && hash === null
    );
  }

  let definitionArgs = [params.slice(0, 1), null, null, null];
  let args = [null, hash, null, null];
  builder.component.dynamic(definitionArgs, dynamicEngineFor, args, builder.symbolTable);
  return true;
}

class DynamicEngineReference {
  constructor({ nameRef, env, symbolTable, args }) {
    this.tag = nameRef.tag;
    this.nameRef = nameRef;
    this.env = env;
    this.symbolTable = symbolTable;
    this._lastName = undefined;
    this._lastDef = undefined;
  }

  value() {
    let { env, nameRef, /*symbolTable*/ } = this;
    let nameOrDef = nameRef.value();

    if (typeof nameOrDef === 'string') {
      if (this._lastName === nameOrDef) {
        return this._lastDef;
      }

      assert(
        `You used \`{{mount '${nameOrDef}'}}\`, but the engine '${nameOrDef}' can not be found.`,
        env.owner.hasRegistration(`engine:${nameOrDef}`)
      );

      if (!env.owner.hasRegistration(`engine:${nameOrDef}`)) {
        return null;
      }

      this._lastName = nameOrDef;
      this._lastDef = new MountDefinition(nameOrDef);

      return this._lastDef;
    } else {
      assert(
        `Invalid engine name '${nameOrDef}' specified, engine name must be either a string, null or undefined.`,
        nameOrDef === null || nameOrDef === undefined
      );

      return null;
    }
  }
}

class MountManager extends AbstractManager {
  prepareArgs(definition, args) {
    return args;
  }

  create(environment, { name }, args, dynamicScope) {
    if (DEBUG) {
      this._pushEngineToDebugStack(`engine:${name}`, environment)
    }

    dynamicScope.outletState = UNDEFINED_REFERENCE;

    let engine = environment.owner.buildChildEngineInstance(name);

    engine.boot();

    return { engine, args };
  }

  layoutFor(definition, { engine }, env) {
    let template = engine.lookup(`template:application`);
    return env.getCompiledBlock(OutletLayoutCompiler, template);
  }

  getSelf(bucket) {
    let { engine, args } = bucket;

    let applicationFactory = engine.factoryFor(`controller:application`);
    let controllerFactory = applicationFactory || generateControllerFactory(engine, 'application');
    let controller = bucket.controller = controllerFactory.create();

    if (EMBER_ENGINES_MOUNT_PARAMS) {
      let model = args.named.value();
      bucket.argsRevision = args.tag.value();
      controller.set('model', model);
    }

    return new RootReference(controller);
  }

  getTag() {
    return null;
  }

  getDestructor({ engine }) {
    return engine;
  }

  didCreateElement() {}

  didRenderLayout() {
    if (DEBUG) {
      this.debugStack.pop()
    }
  }

  didCreate(state) {}

  update(bucket) {
    if (EMBER_ENGINES_MOUNT_PARAMS) {
      let { controller, args, argsRevision } = bucket;

      if (!args.tag.validate(argsRevision)) {
        let model = args.named.value();
        bucket.argsRevision = args.tag.value();
        controller.set('model', model);
      }
    }
  }

  didUpdateLayout() {}
  didUpdate(state) {}
}

const MOUNT_MANAGER = new MountManager();

class MountDefinition extends ComponentDefinition {
  constructor(name) {
    super(name, MOUNT_MANAGER, null);
  }
}
