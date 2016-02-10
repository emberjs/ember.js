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

  didCreate(component) {
    // component.didInsertElement();
    // component.didRender();
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

  getSelf(component) {
    return component;
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
    builder.tag('div');
    builder.attrs.dynamic({ name: 'id', value: elementId });
    builder.attrs.static({ name: 'class', value: 'ember-view' });
    builder.body.fromLayout(this.getLayout());
  }
}
