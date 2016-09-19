import { generateGuid, guidFor } from 'ember-utils';
import {
  ArgsSyntax,
  StatementSyntax,
  ComponentDefinition
} from 'glimmer-runtime';
import { _instrumentStart } from 'ember-metal';
import { RootReference } from '../utils/references';
import {
  UpdatableTag,
  ConstReference,
  combine
} from 'glimmer-reference';

function outletComponentFor(vm) {
  let { outletState } = vm.dynamicScope();

  let args = vm.getArgs();
  let outletNameRef;
  if (args.positional.length === 0) {
    outletNameRef = new ConstReference('main');
  } else {
    outletNameRef = args.positional.at(0);
  }

  return new OutletComponentReference(outletNameRef, outletState);
}

export class OutletSyntax extends StatementSyntax {
  static create(environment, args, templates, symbolTable) {
    let definitionArgs = ArgsSyntax.fromPositionalArgs(args.positional.slice(0, 1));

    return new this(environment, definitionArgs, templates, symbolTable);
  }

  constructor(environment, args, templates, symbolTable) {
    super();
    this.definitionArgs = args;
    this.definition = outletComponentFor;
    this.args = ArgsSyntax.empty();
    this.symbolTable = symbolTable;
    this.templates = null;
    this.shadow = null;
  }

  compile(builder) {
    builder.component.dynamic(this.definitionArgs, this.definition, this.args, this.templates, this.symbolTable, this.shadow);
  }
}

class OutletComponentReference {
  constructor(outletNameRef, parentOutletStateRef) {
    this.outletNameRef = outletNameRef;
    this.parentOutletStateRef = parentOutletStateRef;
    this.definition = null;
    this.lastState = null;
    let outletStateTag = this.outletStateTag = new UpdatableTag(parentOutletStateRef.tag);
    this.tag = combine([outletStateTag.tag, outletNameRef.tag]);
  }

  value() {
    let { outletNameRef, parentOutletStateRef, definition, lastState } = this;


    let outletName = outletNameRef.value();
    let outletStateRef = parentOutletStateRef.get('outlets').get(outletName);
    let newState = this.lastState = outletStateRef.value();

    this.outletStateTag.update(outletStateRef.tag);

    definition = revalidate(definition, lastState, newState);

    let hasTemplate = newState && newState.render.template;

    if (definition) {
      return definition;
    } else if (hasTemplate) {
      return this.definition = new OutletComponentDefinition(outletName, newState.render.template);
    } else {
      return null;
    }
  }
}

function revalidate(definition, lastState, newState) {
  if (!lastState && !newState) {
    return definition;
  }

  if (!lastState && newState || lastState && !newState) {
    return null;
  }

  if (
    newState.render.template === lastState.render.template &&
    newState.render.controller === lastState.render.controller
  ) {
    return definition;
  }

  return null;
}

function instrumentationPayload({ render: { name, outlet } }) {
  return { object: `${name}:${outlet}` };
}

function NOOP() {}

class StateBucket {
  constructor(outletState) {
    this.outletState = outletState;
    this.instrument();
  }

  instrument() {
    this.finalizer = _instrumentStart('render.outlet', instrumentationPayload, this.outletState);
  }

  finalize() {
    let { finalizer } = this;
    finalizer();
    this.finalizer = NOOP;
  }
}

class OutletComponentManager {
  prepareArgs(definition, args) {
    return args;
  }

  create(environment, definition, args, dynamicScope) {
    let outletStateReference = dynamicScope.outletState = dynamicScope.outletState.get('outlets').get(definition.outletName);
    let outletState = outletStateReference.value();
    return new StateBucket(outletState);
  }

  layoutFor(definition, bucket, env) {
    let { template } = definition;
    let owner = template.meta.owner;

    return env.getCompiledBlock(OutletLayoutCompiler, definition.template, owner);
  }

  getSelf({ outletState }) {
    return new RootReference(outletState.render.controller);
  }

  getTag() {
    return null;
  }

  getDestructor() {
    return null;
  }

  didRenderLayout(bucket) {
    bucket.finalize();
  }

  didCreateElement() {}
  didCreate(state) {}
  update(bucket) {}
  didUpdateLayout(bucket) {}
  didUpdate(state) {}
}

const MANAGER = new OutletComponentManager();

class TopLevelOutletComponentManager extends OutletComponentManager {
  create(environment, definition, args, dynamicScope) {
    return new StateBucket(dynamicScope.outletState.value());
  }

  layoutFor(definition, bucket, env) {
    let { template } = definition;
    let owner = template.meta.owner;

    return env.getCompiledBlock(TopLevelOutletLayoutCompiler, template, owner);
  }
}

const TOP_LEVEL_MANAGER = new TopLevelOutletComponentManager();


export class TopLevelOutletComponentDefinition extends ComponentDefinition {
  constructor(instance) {
    super('outlet', TOP_LEVEL_MANAGER, instance);
    this.template = instance.template;
    generateGuid(this);
  }
}

class TopLevelOutletLayoutCompiler {
  constructor(template) {
    this.template = template;
  }

  compile(builder) {
    builder.wrapLayout(this.template.asLayout());
    builder.tag.static('div');
    builder.attrs.static('id', guidFor(this));
    builder.attrs.static('class', 'ember-view');
  }
}

TopLevelOutletLayoutCompiler.id = 'top-level-outlet';

class OutletComponentDefinition extends ComponentDefinition {
  constructor(outletName, template) {
    super('outlet', MANAGER, null);
    this.outletName = outletName;
    this.template = template;
    generateGuid(this);
  }
}

export class OutletLayoutCompiler {
  constructor(template) {
    this.template = template;
  }

  compile(builder) {
    builder.wrapLayout(this.template.asLayout());
  }
}

OutletLayoutCompiler.id = 'outlet';
