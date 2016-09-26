/**
@module ember
@submodule ember-glimmer
*/
import {
  ArgsSyntax,
  StatementSyntax,
  ComponentDefinition
} from 'glimmer-runtime';
import { UNDEFINED_REFERENCE } from 'glimmer-reference';
import { assert } from 'ember-metal';
import { RootReference } from '../utils/references';
import { generateControllerFactory } from 'ember-routing';
import { OutletLayoutCompiler } from './outlet';
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
export class MountSyntax extends StatementSyntax {
  static create(env, args, symbolTable) {
    assert(
      'You can only pass a single argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.',
      args.positional.length === 1 && args.named.length === 0
    );

    assert(
      'The first argument of {{mount}} must be quoted, e.g. {{mount "chat-engine"}}.',
      args.positional.at(0).type === 'value' && typeof args.positional.at(0).inner() === 'string'
    );

    let name = args.positional.at(0).inner();

    assert(
      `You used \`{{mount '${name}'}}\`, but the engine '${name}' can not be found.`,
      env.owner.hasRegistration(`engine:${name}`)
    );

    let definition = new MountDefinition(name, env);

    return new MountSyntax(definition, symbolTable);
  }

  constructor(definition, symbolTable) {
    super();
    this.definition = definition;
    this.symbolTable = symbolTable;
  }

  compile(builder) {
    builder.component.static(this.definition, ArgsSyntax.empty(), null, this.symbolTable, null);
  }
}

class MountManager {
  prepareArgs(definition, args) {
    return args;
  }

  create(environment, { name, env }, args, dynamicScope) {
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
    let factory = engine.factoryFor(`controller:application`) || generateControllerFactory(engine, 'application');
    return new RootReference(factory.create());
  }

  getTag() {
    return null;
  }

  getDestructor({ engine }) {
    return engine;
  }

  didCreateElement() {}
  didRenderLayout() {}
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
