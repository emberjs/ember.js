import { StatementSyntax, ValueReference, EvaluatedArgs } from 'glimmer-runtime';
import { AttributeBindingReference, RootReference, applyClassNameBinding } from '../utils/references';
import { DIRTY_TAG } from '../ember-views/component';
import { COMPONENT_ARGS } from '../ember-views/attrs-support';

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
    let props = new EvaluatedArgs();
    props[COMPONENT_ARGS] = args;
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

      let oldAttrs = new EvaluatedArgs();
      component[COMPONENT_ARGS].named.forEach((argName, arg) => {
        oldAttrs[argName] = arg.lastValue();
      });

      let newAttrs = component[COMPONENT_ARGS].named.value();
      // Seems like this is a good place to notify all
      // non-glimmer dependents that this value has changed
      // but we're essentially trying to integrate the
      // pull-based Glimmer reference system with the
      // push-based system of the rest of Ember.

      // I don't actually know how to reconcile those things
      // in my existing mental model of the world.
      // I think we somehow need to establish a watcher on
      // the references during create and notify it
      // on mutableReference.compute()?
      //component.notifyPropertyChange(COMPONENT_ARGS);

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
