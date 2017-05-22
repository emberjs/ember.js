import { OWNER } from 'ember-utils';
import {
  PrimitiveReference
} from '@glimmer/runtime';
import {
  assert
} from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import {
  ROOT_REF,
  DIRTY_TAG,
  IS_DISPATCHING_ATTRS,
  HAS_BLOCK,
  BOUNDS
} from '../component';
import {
  AttributeBinding,
  ClassNameBinding,
  IsVisibleBinding
} from '../utils/bindings';
import {
  get,
  _instrumentStart
} from 'ember-metal';
import {
  gatherArgs,
  ComponentArgs
} from '../utils/process-args';
import {
  dispatchLifeCycleHook,
  setViewElement
} from 'ember-views';
import { privatize as P } from 'container';
import AbstractManager from '../syntax/abstract-manager';
import ComponentStateBucket from '../syntax/component-state-bucket';
import {
  initialRenderInstrumentDetails,
  rerenderInstrumentDetails,
  validatePositionalParameters,
  processComponentInitializationAssertions
} from '../syntax/curly-component';

const DEFAULT_LAYOUT = P`template:components/-default`;

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

function tagName(vm) {
  let { tagName } = vm.dynamicScope().view;

  return PrimitiveReference.create(tagName === '' ? null : tagName || 'div');
}

function ariaRole(vm) {
  return vm.getSelf().get('ariaRole');
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

export default class CurlyComponentManager extends AbstractManager {
  prepareArgs(definition, args) {
    if (definition.ComponentClass) {
      validatePositionalParameters(args.named, args.positional.values, definition.ComponentClass.class.positionalParams);
    }

    return gatherArgs(args, definition);
  }

  create(environment, definition, args, dynamicScope, callerSelfRef, hasBlock) {
    if (DEBUG) {
      this._pushToDebugStack(`component:${definition.name}`, environment)
    }

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

    if (DEBUG) {
      processComponentInitializationAssertions(component, props);
    }

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

    if (DEBUG) {
      this.debugStack.pop();
    }
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

    if (DEBUG) {
       this._pushToDebugStack(component._debugContainerKey, environment)
    }

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

    if (DEBUG) {
      this.debugStack.pop();
    }
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
