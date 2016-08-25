import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';
import { generateGuid, guidFor } from 'ember-metal/utils';
import { _instrumentStart } from 'ember-metal/instrumentation';
import { RootReference } from '../utils/references';

function outletComponentFor(vm) {
  let { outletState, isTopLevel } = vm.dynamicScope();

  if (isTopLevel) {
    return new TopLevelOutletComponentReference(outletState);
  } else {
    let args = vm.getArgs();
    let outletName = args.positional.at(0).value() || 'main';
    return new OutletComponentReference(outletName, outletState.get(outletName));
  }
}

export class OutletSyntax extends StatementSyntax {
  constructor({ args }) {
    super();
    this.definitionArgs = args;
    this.definition = outletComponentFor;
    this.args = ArgsSyntax.empty();
    this.templates = null;
    this.shadow = null;
  }

  compile(builder) {
    builder.component.dynamic(this);
  }
}

class TopLevelOutletComponentReference {
  constructor(reference) {
    this.outletReference = reference;
    this.lastState = reference.value();
    this.definition = new TopLevelOutletComponentDefinition(this.lastState.render.template);
    this.tag = reference.tag;
  }

  value() {
    let lastState = this.lastState;
    let newState = this.outletReference.value();

    if (lastState.render.name !== newState.render.name) {
      return new TopLevelOutletComponentDefinition(newState.outlets.main.render.template);
    }

    return this.definition;
  }
}

class OutletComponentReference {
  constructor(outletName, reference) {
    this.outletName = outletName;
    this.reference = reference;
    this.definition = null;
    this.lastState = null;
    this.tag = reference.tag;
  }

  value() {
    let { outletName, reference, definition, lastState } = this;
    let newState = this.lastState = reference.value();
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

class AbstractOutletComponentManager {
  prepareArgs(definition, args) {
    return args;
  }

  create(definition, args, dynamicScope) {
    throw new Error('Not implemented: create');
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

class TopLevelOutletComponentManager extends AbstractOutletComponentManager {
  create(definition, args, dynamicScope) {
    dynamicScope.isTopLevel = false;
    return new StateBucket(dynamicScope.outletState.value());
  }

  layoutFor(definition, bucket, env) {
    return env.getCompiledBlock(TopLevelOutletLayoutCompiler, definition.template);
  }
}

const TOP_LEVEL_MANAGER = new TopLevelOutletComponentManager();

class OutletComponentManager extends AbstractOutletComponentManager {
  create(definition, args, dynamicScope) {
    let outletStateReference = dynamicScope.outletState = dynamicScope.outletState.get(definition.outletName);
    let outletState = outletStateReference.value();
    dynamicScope.targetObject = outletState.render.controller;
    return new StateBucket(outletState);
  }

  layoutFor(definition, bucket, env) {
    return env.getCompiledBlock(OutletLayoutCompiler, definition.template);
  }
}

const MANAGER = new OutletComponentManager();

import { ComponentDefinition } from 'glimmer-runtime';

class AbstractOutletComponentDefinition extends ComponentDefinition {
  constructor(manager, outletName, template) {
    super('outlet', manager, null);
    this.outletName = outletName;
    this.template = template;
    generateGuid(this);
  }
}

class TopLevelOutletComponentDefinition extends AbstractOutletComponentDefinition {
  constructor(template) {
    super(TOP_LEVEL_MANAGER, null, template);
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

class OutletComponentDefinition extends AbstractOutletComponentDefinition {
  constructor(outletName, template) {
    super(MANAGER, outletName, template);
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
