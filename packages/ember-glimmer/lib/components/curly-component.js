import { StatementSyntax, ValueReference } from 'glimmer-runtime';
import { AttributeBindingReference, RootReference, applyClassNameBinding } from '../utils/references';
import { DIRTY_TAG } from '../ember-views/component';
import EmptyObject from 'ember-metal/empty_object';
import { assert } from 'ember-metal/debug';

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

function handleAliases(attrs) {
  if (attrs.id && !attrs.elementId) {
    attrs.elementId = attrs.id;
  }
  return attrs;
}

function attrsToProps(keys, attrs) {
  let merged = new EmptyObject();

  merged.attrs = attrs;

  for (let i = 0, l = keys.length; i < l; i++) {
    let name = keys[i];
    let value = attrs[name];

    merged[name] = value;
  }

  return merged;
}

class ComponentStateBucket {
  constructor(component, args) {
    this.component = component;
    this.classRef = null;
    this.argsRevision = args.tag.value();
  }
}

class CurlyComponentManager {
  create(definition, args, dynamicScope) {
    let parentView = dynamicScope.view;

    let klass = definition.ComponentClass;
    let attrs = args.named.value();
    let props = handleAliases(attrsToProps(args.named.keys, attrs));

    props.renderer = parentView.renderer;

    let component = klass.create(props);

    dynamicScope.view = component;
    parentView.appendChild(component);

    component.trigger('didInitAttrs', { attrs });
    component.trigger('didReceiveAttrs', { newAttrs: attrs });
    component.trigger('willInsertElement');
    component.trigger('willRender');

    let bucket = new ComponentStateBucket(component, args);

    if (args.named.has('class')) {
      bucket.classRef = args.named.get('class');
    }

    assert('classNameBindings must not have spaces in them', () => {
      let { classNameBindings } = component;
      for (let i = 0; i < classNameBindings.length; i++) {
        let binding = classNameBindings[i];
        if (binding.split(' ').length > 1) {
          return false;
        }
      }
      return true;
    });

    assert('You cannot use `classNameBindings` on a tag-less component: ' + component.toString(), () => {
      let { classNameBindings, tagName } = component;
      return tagName || !classNameBindings || classNameBindings.length === 0;
    });

    assert('You cannot use `elementId` on a tag-less component: ' + component.toString(), () => {
      let { elementId, tagName } = component;
      return tagName || (!elementId && elementId !== '');
    });

    assert('You cannot use `attributeBindings` on a tag-less component: ' + component.toString(), () => {
      let { attributeBindings, tagName } = component;
      return tagName || !attributeBindings || attributeBindings.length === 0;
    });

    return bucket;
  }

  getSelf({ component }) {
    return new RootReference(component);
  }

  didCreateElement({ component, classRef }, element, operations) {
    component.element = element;

    let { attributeBindings, classNames, classNameBindings } = component;

    if (attributeBindings) {
      attributeBindings.forEach(binding => {
        AttributeBindingReference.apply(component, binding, operations);
      });
    }

    if (classRef) {
      operations.addAttribute('class', classRef);
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

  getTag({ component }) {
    return component[DIRTY_TAG];
  }

  didCreate({ component }) {
    component.trigger('didInsertElement');
    component.trigger('didRender');
    component._transitionTo('inDOM');
  }

  update(bucket, args, dynamicScope) {
    let { component, argsRevision } = bucket;

    if (!args.tag.validate(argsRevision)) {
      bucket.argsRevision = args.tag.value();

      let attrs = args.named.value();
      let props = attrsToProps(args.named.keys, attrs);

      let oldAttrs = component.attrs;
      let newAttrs = attrs;

      component.setProperties(props);

      component.trigger('didUpdateAttrs', { oldAttrs, newAttrs });
      component.trigger('didReceiveAttrs', { oldAttrs, newAttrs });
    }

    component.trigger('willUpdate');
    component.trigger('willRender');
  }

  didUpdate({ component }) {
    component.trigger('didUpdate');
    component.trigger('didRender');
  }

  getDestructor({ component }) {
    return component;
  }
}

const MANAGER = new CurlyComponentManager();

import { ComponentDefinition } from 'glimmer-runtime';
import Component from '../ember-views/component';

function tagName(vm) {
  let { tagName } = vm.dynamicScope().view;

  return new ValueReference(tagName === '' ? null : tagName || 'div');
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
