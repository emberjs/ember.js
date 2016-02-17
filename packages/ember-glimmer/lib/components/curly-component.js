import { StatementSyntax } from 'glimmer-runtime';

export class CurlyComponentSyntax extends StatementSyntax {
  constructor(options) {
    super();
    this.options = options;
  }

  compile(builder) {
    builder.openComponent(this.options);
    builder.closeComponent();
  }
}

import assign from 'ember-metal/assign';

class CurlyComponentManager {
  create(definition, args) {
    let klass = definition.ComponentClass;
    let attrs = args.value();
    let merged = assign({}, attrs, { attrs });
    let component = klass.create(merged);

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
    // component._transitionTo('hasElement');
  }


  didCreate(component) {
    // component.didInsertElement();
    // component.didRender();
    // component._transitionTo('inDOM');
  }

  update(component, args) {
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
}

const MANAGER = new CurlyComponentManager();

import { ComponentDefinition, ValueReference } from 'glimmer-runtime';
import Component from 'ember-views/components/component';

function elementId(vm) {
  let component = vm.getSelf().value();
  return new ValueReference(component.elementId);
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
    builder.wrapLayout(this.getLayout());
    builder.tag.static('div');
    builder.attrs.dynamic('id', elementId);
    builder.attrs.static('class', 'ember-view');
  }
}
