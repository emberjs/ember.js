import { ArgsSyntax, StatementSyntax } from 'glimmer-runtime';
import { ConstReference } from 'glimmer-reference';
import { generateGuid, guidFor } from 'ember-metal/utils';
import { RootReference, NULL_REFERENCE } from '../utils/references';

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

class TopLevelOutletComponentReference extends ConstReference {
  constructor(reference) {
    let outletState = reference.value();
    let definition = new TopLevelOutletComponentDefinition(outletState.render.template);

    super(definition);
  }
}

const INVALIDATE = null;

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
    let newState = reference.value();

    definition = revalidate(definition, lastState, newState);

    if (definition) {
      return definition;
    } else if (newState) {
      return this.definition = new OutletComponentDefinition(outletName, newState.render.template);
    } else {
      return this.definition = EMPTY_OUTLET_DEFINITION;
    }
  }

  destroy() {}
}

function revalidate(definition, lastState, newState) {
  if (!lastState && !newState) {
    return definition;
  }

  if (!lastState && newState || lastState && !newState) {
    return INVALIDATE;
  }

  if (
    newState.template === lastState.template &&
    newState.controller === lastState.controller
  ) {
    return definition;
  }

  return INVALIDATE;
}


class AbstractOutletComponentManager {
  create(definition, args, dynamicScope) {
    throw new Error('Not implemented: create');
  }

  ensureCompilable(definition) {
    return definition;
  }

  getSelf(state) {
    return new RootReference(state.render.controller);
  }

  getTag(state) {
    return null;
  }

  getDestructor(state) {
    return null;
  }

  didCreateElement() {}
  didCreate(state) {}
  update(state, args, dynamicScope) {}
  didUpdate(state) {}
}

class TopLevelOutletComponentManager extends AbstractOutletComponentManager {
  create(definition, args, dynamicScope) {
    dynamicScope.isTopLevel = false;
    return dynamicScope.outletState.value();
  }
}

const TOP_LEVEL_MANAGER = new TopLevelOutletComponentManager();

class OutletComponentManager extends AbstractOutletComponentManager {
  create(definition, args, dynamicScope) {
    let outletState = dynamicScope.outletState = dynamicScope.outletState.get(definition.outletName);
    return outletState.value();
  }
}

const MANAGER = new OutletComponentManager();

class EmptyOutletComponentManager extends AbstractOutletComponentManager {
  create(definition, args, dynamicScope) {
    dynamicScope.outletState = null;
    return null;
  }

  getSelf(state) {
    return NULL_REFERENCE;
  }
}

const EMPTY_MANAGER = new EmptyOutletComponentManager();

import { ComponentDefinition } from 'glimmer-runtime';

class AbstractOutletComponentDefinition extends ComponentDefinition {
  constructor(manager, outletName, template) {
    super('outlet', manager, null);
    this.outletName = outletName;
    this.template = template;
    generateGuid(this);
  }

  compile() {
    throw new Error('Unimplemented: compile');
  }
}

class TopLevelOutletComponentDefinition extends AbstractOutletComponentDefinition {
  constructor(template) {
    super(TOP_LEVEL_MANAGER, null, template);
  }

  compile(builder) {
    builder.wrapLayout(this.template.asLayout());
    builder.tag.static('div');
    builder.attrs.static('id', guidFor(this));
    builder.attrs.static('class', 'ember-view');
  }
}

class OutletComponentDefinition extends AbstractOutletComponentDefinition {
  constructor(outletName, template) {
    super(MANAGER, outletName, template);
  }

  compile(builder) {
    builder.wrapLayout(this.template.asLayout());
  }
}

class EmptyOutletComponentDefinition extends AbstractOutletComponentDefinition {
  constructor() {
    super(EMPTY_MANAGER, null, null);
  }

  compile(builder) {
    builder.empty();
  }
}

const EMPTY_OUTLET_DEFINITION = new EmptyOutletComponentDefinition();
