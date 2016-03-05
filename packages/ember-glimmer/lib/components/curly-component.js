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
  create(definition, args, keywords) {
    let klass = definition.ComponentClass;
    let attrs = args.value();
    let merged = assign({}, attrs, { attrs });
    let component = klass.create(merged);

    keywords.get('view').value().appendChild(component);

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

  update(component, args, keywords) {
    // let oldAttrs = component.attrs;
    let newAttrs = args.value();
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
import Component from 'ember-views/components/component';

function elementId(vm) {
  return new ValueReference(getCurrentComponentReference(vm).value().elementId);
}

// This code assumes that `self` is always the current component, which isn't
// true in the case of a defined `view.context`. The information is available
// inside the VM but not yet exposed to Ember.
function getCurrentComponentReference(vm) {
  return vm.getSelf();
}

export class CurlyComponentDefinition extends ComponentDefinition {
  constructor(name, ComponentClass, template) {
    super(name, MANAGER, ComponentClass || Component);
    this.template = template;
  }

  getLayout() {
    return this.template.asLayout();
  }

  compile(builder) {
    builder.bindKeywords({ view: getCurrentComponentReference });
    builder.wrapLayout(this.getLayout());
    builder.tag.static('div');
    builder.attrs.dynamic('id', elementId);
    builder.attrs.static('class', 'ember-view');
  }
}
