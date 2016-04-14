import { StatementSyntax, ValueReference } from 'glimmer-runtime';
import { AttributeBindingReference, RootReference, applyClassNameBinding } from '../utils/references';
import EmptyObject from 'ember-metal/empty_object';

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

function attrsToProps(keys, attrs) {
  let merged = new EmptyObject();

  merged.attrs = merged;

  for (let i = 0, l = keys.length; i < l; i++) {
    let name = keys[i];
    let value = attrs[name];

    // Do we have to support passing both class /and/ classNames...?
    if (name === 'class') {
      name = 'classNames';
    }

    merged[name] = value;
  }

  return merged;
}

class CurlyComponentManager {
  create(definition, args, dynamicScope) {
    let parentView = dynamicScope.view;

    let klass = definition.ComponentClass;
    let attrs = args.named.value();
    let props = attrsToProps(args.named.keys, attrs);

    let component = klass.create(props);

    dynamicScope.view = component;
    parentView.appendChild(component);

    // component.trigger('didInitAttrs', { attrs });
    // component.trigger('didReceiveAttrs', { newAttrs: attrs });
    // component.trigger('willInsertElement');
    // component.trigger('willRender');

    return component;
  }

  getSelf(component) {
    return new RootReference(component);
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
        if (name) {
          operations.addAttribute('class', new ValueReference(name));
        }
      });
    }

    if (classNameBindings) {
      classNameBindings.forEach(binding => {
        if (binding) {
          applyClassNameBinding(component, binding, operations);
        }
      });
    }

    component._transitionTo('hasElement');
  }

  didCreate(component) {
    // component.trigger('didInsertElement');
    // component.trigger('didRender');
    component._transitionTo('inDOM');
  }

  update(component, args, dynamicScope) {
    let attrs = args.named.value();
    let props = attrsToProps(args.named.keys, attrs);

    // let oldAttrs = component.attrs;
    // let newAttrs = attrs;

    component.setProperties(props);

    // component.trigger('didUpdateAttrs', { oldAttrs, newAttrs });
    // component.trigger('didReceiveAttrs', { oldAttrs, newAttrs });
    // component.trigger('willUpdate');
    // component.trigger('willRender');
  }

  didUpdate(component) {
    // component.trigger('didUpdate');
    // component.trigger('didRender');
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
