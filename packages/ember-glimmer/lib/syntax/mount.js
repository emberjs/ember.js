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

  return new ConstReference(new MountDefinition(name, env));
}

export class MountSyntax extends StatementSyntax {
  constructor({ args, symbolTable }) {
    super();
    this.definitionArgs = args;
    this.definition = makeComponentDefinition;
    this.args = ArgsSyntax.empty();
    this.symbolTable = symbolTable;
  }

  compile(builder) {
    builder.component.dynamic(this.definitionArgs, this.definition, this.args, null, this.symbolTable, null);
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
