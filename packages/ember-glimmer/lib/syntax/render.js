import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';
import { ConstReference, isConst } from 'glimmer-reference';
import { assert } from 'ember-metal/debug';
import { RootReference } from '../utils/references';
import { generateControllerFactory } from 'ember-routing/system/generate_controller';
import { OutletLayoutCompiler } from './outlet';

function makeComponentDefinition(vm) {
  let env     = vm.env;
  let args    = vm.getArgs();
  let nameRef = args.positional.at(0);

  assert(`The first argument of {{render}} must be quoted, e.g. {{render "sidebar"}}.`, isConst(nameRef));
  assert(`The second argument of {{render}} must be a path, e.g. {{render "post" post}}.`, args.positional.length === 1 || !isConst(args.positional.at(1)));

  let templateName = nameRef.value();

  assert(`You used \`{{render '${templateName}'}}\`, but '${templateName}' can not be found as a template.`, env.owner.hasRegistration(`template:${templateName}`));

  let template = env.owner.lookup(`template:${templateName}`);

  let controllerName;

  if (args.named.has('controller')) {
    let controllerNameRef = args.named.get('controller');

    assert(`The controller argument for {{render}} must be quoted, e.g. {{render "sidebar" controller="foo"}}.`, isConst(controllerNameRef));

    controllerName = controllerNameRef.value();

    assert(`The controller name you supplied '${controllerName}' did not resolve to a controller.`, env.owner.hasRegistration(`controller:${controllerName}`));
  } else {
    controllerName = templateName;
  }

  if (args.positional.length === 1) {
    return new ConstReference(new RenderDefinition(controllerName, template, env, SINGLETON_RENDER_MANAGER));
  } else {
    return new ConstReference(new RenderDefinition(controllerName, template, env, NON_SINGLETON_RENDER_MANAGER));
  }
}

export class RenderSyntax extends StatementSyntax {
  static create(environment, args, templates, symbolTable) {
    return new this(environment, args, templates, symbolTable);
  }

  constructor(environment, args, templates, symbolTable) {
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

class AbstractRenderManager {
  prepareArgs(definition, args) {
    return args;
  }

  /* abstract create(definition, args, dynamicScope); */

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

class SingletonRenderManager extends AbstractRenderManager {
  create(definition, args, dynamicScope) {
    let { name, env } = definition;
    let controller = env.owner.lookup(`controller:${name}`);

    if (dynamicScope.rootOutletState) {
      dynamicScope.outletState = dynamicScope.rootOutletState.getOrphan(name);
    }

    return { controller };
  }
}

const SINGLETON_RENDER_MANAGER = new SingletonRenderManager();

class NonSingletonRenderManager extends AbstractRenderManager {
  create(definition, args, dynamicScope) {
    let { name, env } = definition;
    let modelRef = args.positional.at(0);

    let factory = env.owner._lookupFactory(`controller:${name}`) || generateControllerFactory(env.owner, name);
    let controller = factory.create({ model: modelRef.value() });

    if (dynamicScope.rootOutletState) {
      dynamicScope.outletState = dynamicScope.rootOutletState.getOrphan(name);
    }

    return { controller };
  }

  update({ controller }, args, dynamicScope) {
    controller.set('model', args.positional.at(0).value());
  }
}

const NON_SINGLETON_RENDER_MANAGER = new NonSingletonRenderManager();

import { ComponentDefinition } from 'glimmer-runtime';

class RenderDefinition extends ComponentDefinition {
  constructor(name, template, env, manager) {
    super('render', manager, null);

    this.name = name;
    this.template = template;
    this.env = env;
  }
}
