import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';
import { UNDEFINED_REFERENCE } from 'glimmer-reference';
import { assert } from 'ember-metal/debug';
import { RootReference } from '../utils/references';
import { generateControllerFactory } from 'ember-routing/system/generate_controller';
import { OutletLayoutCompiler } from './outlet';

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

  create({ name, env }, args, dynamicScope) {
    dynamicScope.outletState = UNDEFINED_REFERENCE;

    let engine = env.owner.buildChildEngineInstance(name);

    engine.boot();

    return { engine };
  }

  layoutFor(definition, { engine }, env) {
    let template = engine.lookup(`template:application`);
    return env.getCompiledBlock(OutletLayoutCompiler, template, engine);
  }

  getSelf({ engine }) {
    let factory = engine._lookupFactory(`controller:application`) || generateControllerFactory(engine, 'application');
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

import { ComponentDefinition } from 'glimmer-runtime';

class MountDefinition extends ComponentDefinition {
  constructor(name, env) {
    super(name, MOUNT_MANAGER, null);
    this.env = env;
  }
}
