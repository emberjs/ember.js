import { OWNER } from 'ember-utils';
import {
  PrimitiveReference,
  ComponentDefinition
} from '@glimmer/runtime';
import {
  AttributeBinding,
  ClassNameBinding,
  IsVisibleBinding
} from '../utils/bindings';
import {
  ROOT_REF,
  DIRTY_TAG,
  IS_DISPATCHING_ATTRS,
  HAS_BLOCK,
  BOUNDS
} from '../component';
import {
  get,
  _instrumentStart
} from 'ember-metal';
import {
  assert,
  runInDebug
} from 'ember-debug';
import {
  dispatchLifeCycleHook,
  setViewElement
} from 'ember-views';
import {
  gatherArgs,
  ComponentArgs
} from '../utils/process-args';
import { privatize as P } from 'container';
import AbstractManager from './abstract-manager';

const DEFAULT_LAYOUT = P`template:components/-default`;

function processComponentInitializationAssertions(component, props) {
  assert(`classNameBindings must not have spaces in them: ${component.toString()}`, (() => {
    let { classNameBindings } = component;
    for (let i = 0; i < classNameBindings.length; i++) {
      let binding = classNameBindings[i];
      if (binding.split(' ').length > 1) {
        return false;
      }
    }
    return true;
  })());

  assert('You cannot use `classNameBindings` on a tag-less component: ' + component.toString(), (() => {
    let { classNameBindings, tagName } = component;
    return tagName !== '' || !classNameBindings || classNameBindings.length === 0;
  })());

  assert('You cannot use `elementId` on a tag-less component: ' + component.toString(), (() => {
    let { elementId, tagName } = component;
    return tagName !== '' || props.id === elementId || (!elementId && elementId !== '');
  })());

  assert('You cannot use `attributeBindings` on a tag-less component: ' + component.toString(), (() => {
    let { attributeBindings, tagName } = component;
    return tagName !== '' || !attributeBindings || attributeBindings.length === 0;
  })());
}

export function validatePositionalParameters(named, positional, positionalParamsDefinition) {
  runInDebug(() => {
    if (!named || !positional || !positional.length) {
      return;
    }

    let paramType = typeof positionalParamsDefinition;

    if (paramType === 'string') {
      assert(`You cannot specify positional parameters and the hash argument \`${positionalParamsDefinition}\`.`, !named.has(positionalParamsDefinition));
    } else {
      if (positional.length < positionalParamsDefinition.length) {
        positionalParamsDefinition = positionalParamsDefinition.slice(0, positional.length);
      }

      for (let i = 0; i < positionalParamsDefinition.length; i++) {
        let name = positionalParamsDefinition[i];

        assert(
          `You cannot specify both a positional param (at position ${i}) and the hash argument \`${name}\`.`,
          !named.has(name)
        );
      }
    }
  });
}

function aliasIdToElementId(args, props) {
  if (args.named.has('id')) {
    assert(`You cannot invoke a component with both 'id' and 'elementId' at the same time.`, !args.named.has('elementId'));
    props.elementId = props.id;
  }
}

// We must traverse the attributeBindings in reverse keeping track of
// what has already been applied. This is essentially refining the concated
// properties applying right to left.
function applyAttributeBindings(element, attributeBindings, component, operations) {
  let seen = [];
  let i = attributeBindings.length - 1;

  while (i !== -1) {
    let binding = attributeBindings[i];
    let parsed = AttributeBinding.parse(binding);
    let attribute = parsed[1];

    if (seen.indexOf(attribute) === -1) {
      seen.push(attribute);
      AttributeBinding.install(element, component, parsed, operations);
    }

    i--;
  }

  if (seen.indexOf('id') === -1) {
    operations.addStaticAttribute(element, 'id', component.elementId);
  }

  if (seen.indexOf('style') === -1) {
    IsVisibleBinding.install(element, component, operations);
  }
}

function NOOP() {}

class ComponentStateBucket {
  constructor(environment, component, args, finalizer) {
    this.environment = environment;
    this.component = component;
    this.classRef = null;
    this.args = args;
    this.argsRevision = args.tag.value();
    this.finalizer = finalizer;
  }

  destroy() {
    let { component, environment } = this;

    if (environment.isInteractive) {
      component.trigger('willDestroyElement');
      component.trigger('willClearRender');
    }

    environment.destroyedComponents.push(component);
  }

  finalize() {
    let { finalizer } = this;
    finalizer();
    this.finalizer = NOOP;
  }
}

function initialRenderInstrumentDetails(component) {
  return component.instrumentDetails({ initialRender: true });
}

function rerenderInstrumentDetails(component) {
  return component.instrumentDetails({ initialRender: false });
}

class CurlyComponentManager extends AbstractManager {
  prepareArgs(definition, args) {
    if (definition.ComponentClass) {
      validatePositionalParameters(args.named, args.positional.values, definition.ComponentClass.class.positionalParams);
    }

    return gatherArgs(args, definition);
  }

  create(environment, definition, args, dynamicScope, callerSelfRef, hasBlock) {
    runInDebug(() => this._pushToDebugStack(`component:${definition.name}`, environment));

    let parentView = dynamicScope.view;

    let factory = definition.ComponentClass;

    let processedArgs = ComponentArgs.create(args);
    let { props } = processedArgs.value();

    aliasIdToElementId(args, props);

    props.parentView = parentView;
    props[HAS_BLOCK] = hasBlock;

    props._targetObject = callerSelfRef.value();

    let component = factory.create(props);

    let finalizer = _instrumentStart('render.component', initialRenderInstrumentDetails, component);

    dynamicScope.view = component;

    if (parentView !== null) {
      parentView.appendChild(component);
    }

    // We usually do this in the `didCreateElement`, but that hook doesn't fire for tagless components
    if (component.tagName === '') {
      if (environment.isInteractive) {
        component.trigger('willRender');
      }

      component._transitionTo('hasElement');

      if (environment.isInteractive) {
        component.trigger('willInsertElement');
      }
    }

    let bucket = new ComponentStateBucket(environment, component, processedArgs, finalizer);

    if (args.named.has('class')) {
      bucket.classRef = args.named.get('class');
    }

    runInDebug(() => {
      processComponentInitializationAssertions(component, props);
    });

    if (environment.isInteractive && component.tagName !== '') {
      component.trigger('willRender');
    }

    return bucket;
  }

  layoutFor(definition, bucket, env) {
    let template = definition.template;
    if (!template) {
      let { component } = bucket;
      template = this.templateFor(component, env);
    }
    return env.getCompiledBlock(CurlyComponentLayoutCompiler, template);
  }

  templateFor(component, env) {
    let Template = get(component, 'layout');
    let owner = component[OWNER];
    if (Template) {
      return env.getTemplate(Template, owner);
    }
    let layoutName = get(component, 'layoutName');
    if (layoutName) {
      let template = owner.lookup('template:' + layoutName);
      if (template) {
        return template;
      }
    }
    return owner.lookup(DEFAULT_LAYOUT);
  }

  getSelf({ component }) {
    return component[ROOT_REF];
  }

  didCreateElement({ component, classRef, environment }, element, operations) {
    setViewElement(component, element);

    let { attributeBindings, classNames, classNameBindings } = component;

    if (attributeBindings && attributeBindings.length) {
      applyAttributeBindings(element, attributeBindings, component, operations);
    } else {
      operations.addStaticAttribute(element, 'id', component.elementId);
      IsVisibleBinding.install(element, component, operations);
    }

    if (classRef) {
      operations.addDynamicAttribute(element, 'class', classRef);
    }

    if (classNames && classNames.length) {
      classNames.forEach(name => {
        operations.addStaticAttribute(element, 'class', name);
      });
    }

    if (classNameBindings && classNameBindings.length) {
      classNameBindings.forEach(binding => {
        ClassNameBinding.install(element, component, binding, operations);
      });
    }

    component._transitionTo('hasElement');

    if (environment.isInteractive) {
      component.trigger('willInsertElement');
    }
  }

  didRenderLayout(bucket, bounds) {
    bucket.component[BOUNDS] = bounds;
    bucket.finalize();

    runInDebug(() => this.debugStack.pop());
  }

  getTag({ component }) {
    return component[DIRTY_TAG];
  }

  didCreate({ component, environment }) {
    if (environment.isInteractive) {
      component._transitionTo('inDOM');
      component.trigger('didInsertElement');
      component.trigger('didRender');
    }
  }

  update(bucket, _, dynamicScope) {
    let { component, args, argsRevision, environment } = bucket;

    runInDebug(() => this._pushToDebugStack(component._debugContainerKey, environment));

    bucket.finalizer = _instrumentStart('render.component', rerenderInstrumentDetails, component);

    if (!args.tag.validate(argsRevision)) {
      let { attrs, props } = args.value();

      bucket.argsRevision = args.tag.value();

      let oldAttrs = component.attrs;
      let newAttrs = attrs;

      component[IS_DISPATCHING_ATTRS] = true;
      component.setProperties(props);
      component[IS_DISPATCHING_ATTRS] = false;

      dispatchLifeCycleHook(component, 'didUpdateAttrs', oldAttrs, newAttrs);
      dispatchLifeCycleHook(component, 'didReceiveAttrs', oldAttrs, newAttrs);
    }

    if (environment.isInteractive) {
      component.trigger('willUpdate');
      component.trigger('willRender');
    }
  }

  didUpdateLayout(bucket) {
    bucket.finalize();

    runInDebug(() => this.debugStack.pop());
  }

  didUpdate({ component, environment }) {
    if (environment.isInteractive) {
      component.trigger('didUpdate');
      component.trigger('didRender');
    }
  }

  getDestructor(stateBucket) {
    return stateBucket;
  }
}

const MANAGER = new CurlyComponentManager();

class TopComponentManager extends CurlyComponentManager {
  create(environment, definition, args, dynamicScope, currentScope, hasBlock) {
    let component = definition.ComponentClass.create();

    runInDebug(() => this._pushToDebugStack(component._debugContainerKey, environment));

    let finalizer = _instrumentStart('render.component', initialRenderInstrumentDetails, component);

    dynamicScope.view = component;

    // We usually do this in the `didCreateElement`, but that hook doesn't fire for tagless components
    if (component.tagName === '') {
      if (environment.isInteractive) {
        component.trigger('willRender');
      }

      component._transitionTo('hasElement');

      if (environment.isInteractive) {
        component.trigger('willInsertElement');
      }
    }

    runInDebug(() => {
      processComponentInitializationAssertions(component, {});
    });

    return new ComponentStateBucket(environment, component, args, finalizer);
  }
}

const ROOT_MANAGER = new TopComponentManager();

function tagName(vm) {
  let { tagName } = vm.dynamicScope().view;

  return PrimitiveReference.create(tagName === '' ? null : tagName || 'div');
}

function ariaRole(vm) {
  return vm.getSelf().get('ariaRole');
}

export class CurlyComponentDefinition extends ComponentDefinition {
  constructor(name, ComponentClass, template, args) {
    super(name, MANAGER, ComponentClass);
    this.template = template;
    this.args = args;
  }
}

export class RootComponentDefinition extends ComponentDefinition {
  constructor(instance) {
    super('-root', ROOT_MANAGER, {
      class: instance.constructor,
      create() {
        return instance;
      }
    });
    this.template = undefined;
    this.args = undefined;
  }
}

class CurlyComponentLayoutCompiler {
  constructor(template) {
    this.template = template;
  }

  compile(builder) {
    builder.wrapLayout(this.template.asLayout());
    builder.tag.dynamic(tagName);
    builder.attrs.dynamic('role', ariaRole);
    builder.attrs.static('class', 'ember-view');
  }
}

CurlyComponentLayoutCompiler.id = 'curly';
