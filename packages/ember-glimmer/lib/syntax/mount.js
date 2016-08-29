import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';
import { ConstReference, isConst, UNDEFINED_REFERENCE } from 'glimmer-reference';
import { assert } from 'ember-metal/debug';
import { RootReference } from '../utils/references';
import { generateControllerFactory } from 'ember-routing/system/generate_controller';
import { OutletLayoutCompiler } from './outlet';

function makeComponentDefinition(vm) {
  let env     = vm.env;
  let args    = vm.getArgs();
  let nameRef = args.positional.at(0);

  assert(`The first argument of {{mount}} must be quoted, e.g. {{mount "chat-engine"}}.`, isConst(nameRef));

  let name = nameRef.value();

  assert(`You used \`{{mount '${name}'}}\`, but '${name}' can not be found as an engine.`, env.owner.hasRegistration(`engine:${name}`));

  let engine = env.owner.buildChildEngineInstance(name);

  let template = engine.lookup(`template:application`);

  engine.boot();

  return new ConstReference(new MountDefinition(name, engine, template, env, MOUNT_MANAGER));
}

export class MountSyntax extends StatementSyntax {
  constructor({ args, symbolTable }) {
    super();
    this.definitionArgs = args;
    this.definition = makeComponentDefinition;
    this.args = ArgsSyntax.fromPositionalArgs(args.positional.slice(1, 2));
    this.templates = null;
    this.symbolTable = symbolTable;
    this.shadow = null;
  }

  compile(builder) {
    builder.component.dynamic(this.definitionArgs, this.definition, this.args, this.templates, this.symbolTable, this.shadow);
  }
}

class MountManager {
  prepareArgs(definition, args) {
    return args;
  }

  create(definition, args, dynamicScope) {
    let { engine } = definition;

    let factory = engine._lookupFactory(`controller:application`) || generateControllerFactory(engine, 'application');
    let controller = factory.create();

    dynamicScope.outletState = UNDEFINED_REFERENCE;

    return { controller };
  }

  layoutFor(definition, bucket, env) {
    return env.getCompiledBlock(OutletLayoutCompiler, definition.template);
  }

  getSelf({ controller }) {
    return new RootReference(controller);
  }

  getTag(state) {
    return null;
  }

  getDestructor(state) {
    return state.controller;
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
  constructor(name, engine, template, env, manager) {
    super('mount', manager, null);

    this.name = name;
    this.engine = engine;
    this.template = template;
    this.env = env;
  }
}
