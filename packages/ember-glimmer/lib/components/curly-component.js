import { StatementSyntax, ValueReference } from 'glimmer-runtime';
import { AttributeBindingReference, applyClassNameBinding } from '../utils/references';

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

function argsToProps(args) {
  let attrs = args.named.value();
  let attrKeys = Object.keys(attrs);
  let merged = { attrs: {} };

  for (let i = 0, l = attrKeys.length; i < l; i++) {
    let name = attrKeys[i];
    let value = attrs[name];

    // Do we have to support passing both class /and/ classNames...?
    if (name === 'class') {
      name = 'classNames';
    }

    merged[name] = value;
    merged.attrs[name] = value;
  }

  return merged;
}

class CurlyComponentManager {
  create(definition, args, dynamicScope) {
    let klass = definition.ComponentClass;
    let component = klass.create(argsToProps(args));
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

  didCreateElement(component, element, operations) {
    component.element = element;

    let { attributeBindings, classNames, classNameBindings } = component;

    if (attributeBindings) {
      attributeBindings.forEach(binding => {
        AttributeBindingReference.apply(component, binding, operations);
      });
    }

    if (classNames) {
      classNames.forEach(name => {
        operations.addAttribute('class', new ValueReference(name));
      });
    }

    if (classNameBindings) {
      classNameBindings.forEach(binding => {
        applyClassNameBinding(component, binding, operations);
      });
    }

    component._transitionTo('hasElement');
  }

  didCreate(component) {
    // component.didInsertElement();
    // component.didRender();
    component._transitionTo('inDOM');
  }

  update(component, args, dynamicScope) {
    component.setProperties(argsToProps(args));

    // let oldAttrs = component.attrs;
    // let newAttrs = args.named.value();
    //
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

import { ComponentDefinition } from 'glimmer-runtime';
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
