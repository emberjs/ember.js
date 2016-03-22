import { StatementSyntax } from 'glimmer-runtime';

export class CurlyComponentSyntax extends StatementSyntax {
  constructor({ args, definition, templates }) {
    super();
    this.args = args;
    this.definition = definition;
    this.templates = templates;
    this.shadow = null;
  }

  compile(builder) {
    builder.component.static(this);
  }
}

import assign from 'ember-metal/assign';

class CurlyComponentManager {
  create(definition, args, dynamicScope) {
    let klass = definition.ComponentClass;
    let attrs = args.named.value();
    let merged = assign({}, attrs, { attrs });
    let component = klass.create(merged);
    let parentView = dynamicScope.view;

    dynamicScope.view = component;
    parentView.appendChild(component);

    // component.didInitAttrs({ attrs });
    // component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    // component.willInsertElement();
    // component.willRender();

    return component;
  }

  getSelf(component) {
    return component;
  }

  didCreateElement(component, element) {
    component.element = element;
    component._transitionTo('hasElement');
  }

  didCreate(component) {
    // component.didInsertElement();
    // component.didRender();
    component._transitionTo('inDOM');
  }

  update(component, args, dynamicScope) {
    // let oldAttrs = component.attrs;
    let newAttrs = args.named.value();
    let merged = assign({}, newAttrs, { attrs: newAttrs });

    component.setProperties(merged);
    // component.didUpdateAttrs({ oldAttrs, newAttrs });
    // component.didReceiveAttrs({ oldAttrs, newAttrs });
    // component.willUpdate();
    // component.willRender();
  }

  didUpdate(component) {
    // component.didUpdate();
    // component.didRender();
  }

  getDestructor(component) {
    return component;
  }
}

const MANAGER = new CurlyComponentManager();

import { ComponentDefinition, ValueReference } from 'glimmer-runtime';
import Component from '../ember-views/component';

function tagName(vm) {
  let { tagName } = vm.dynamicScope().view;

  if (tagName === '') {
    throw new Error('Not implemented: fragments (`tagName: ""`)');
  }

  return new ValueReference(tagName || 'div');
}

function elementId(vm) {
  let component = vm.dynamicScope().view;
  return new ValueReference(component.elementId);
}

export class CurlyComponentDefinition extends ComponentDefinition {
  constructor(name, ComponentClass, template) {
    super(name, MANAGER, ComponentClass || Component);
    this.template = template;
  }

  compile(builder) {
    builder.wrapLayout(this.template.asLayout());
    builder.tag.dynamic(tagName);
    builder.attrs.dynamic('id', elementId);
    builder.attrs.static('class', 'ember-view');
  }
}
