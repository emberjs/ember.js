import { Factory, getOwner, Owner, setOwner } from '@ember/-internals/owner';
import { enumerableSymbol, guidFor, symbol } from '@ember/-internals/utils';
import { addChildView, setElementView, setViewElement } from '@ember/-internals/views';
import { assert, debugFreeze } from '@ember/debug';
import { _instrumentStart } from '@ember/instrumentation';
import { DEBUG } from '@glimmer/env';
import {
  Bounds,
  CapturedArguments,
  CompilableProgram,
  Destroyable,
  ElementOperations,
  Environment,
  InternalComponentCapabilities,
  Option,
  PreparedArguments,
  TemplateFactory,
  VMArguments,
  WithCreateInstance,
  WithDynamicLayout,
  WithDynamicTagName,
} from '@glimmer/interfaces';
import {
  childRefFor,
  createComputeRef,
  createPrimitiveRef,
  Reference,
  valueForRef,
} from '@glimmer/reference';
import { reifyPositional } from '@glimmer/runtime';
import { EMPTY_ARRAY, unwrapTemplate } from '@glimmer/util';
import {
  beginTrackFrame,
  beginUntrackFrame,
  consumeTag,
  endTrackFrame,
  endUntrackFrame,
  validateTag,
  valueForTag,
} from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';
import { DynamicScope } from '../renderer';
import RuntimeResolver from '../resolver';
import { isTemplateFactory } from '../template';
import {
  createClassNameBindingRef,
  createSimpleClassNameBindingRef,
  installAttributeBinding,
  parseAttributeBinding,
} from '../utils/bindings';

import ComponentStateBucket, { Component } from '../utils/curly-component-state-bucket';
import { processComponentArgs } from '../utils/process-args';

export const ARGS = enumerableSymbol('ARGS');
export const HAS_BLOCK = enumerableSymbol('HAS_BLOCK');

export const DIRTY_TAG = symbol('DIRTY_TAG');
export const IS_DISPATCHING_ATTRS = symbol('IS_DISPATCHING_ATTRS');
export const BOUNDS = symbol('BOUNDS');

const EMBER_VIEW_REF = createPrimitiveRef('ember-view');

function aliasIdToElementId(args: VMArguments, props: any) {
  if (args.named.has('id')) {
    assert(
      `You cannot invoke a component with both 'id' and 'elementId' at the same time.`,
      !args.named.has('elementId')
    );
    props.elementId = props.id;
  }
}

// We must traverse the attributeBindings in reverse keeping track of
// what has already been applied. This is essentially refining the concatenated
// properties applying right to left.
function applyAttributeBindings(
  attributeBindings: Array<string>,
  component: Component,
  rootRef: Reference<Component>,
  operations: ElementOperations
) {
  let seen: string[] = [];
  let i = attributeBindings.length - 1;

  while (i !== -1) {
    let binding = attributeBindings[i];
    assert('has binding', binding);
    let parsed: [string, string, boolean] = parseAttributeBinding(binding);
    let attribute = parsed[1];

    if (seen.indexOf(attribute) === -1) {
      seen.push(attribute);
      installAttributeBinding(component, rootRef, parsed, operations);
    }

    i--;
  }

  if (seen.indexOf('id') === -1) {
    let id = component.elementId ? component.elementId : guidFor(component);
    operations.setAttribute('id', createPrimitiveRef(id), false, null);
  }
}

const EMPTY_POSITIONAL_ARGS: Reference[] = [];

debugFreeze(EMPTY_POSITIONAL_ARGS);

type ComponentFactory = Factory<
  Component,
  {
    create(props?: any): Component;
    positionalParams: string | string[] | undefined | null;
    name: string;
  }
> & {
  name: string;
  positionalParams: string | string[] | undefined | null;
};

export default class CurlyComponentManager
  implements
    WithCreateInstance<ComponentStateBucket>,
    WithDynamicLayout<ComponentStateBucket, RuntimeResolver>,
    WithDynamicTagName<ComponentStateBucket> {
  protected templateFor(component: Component): CompilableProgram | null {
    let { layout, layoutName } = component;
    let owner = getOwner(component);
    assert('Component is unexpectedly missing an owner', owner);

    let factory: TemplateFactory;

    if (layout === undefined) {
      if (layoutName !== undefined) {
        let _factory = owner.lookup(`template:${layoutName}`) as TemplateFactory;
        assert(`Layout \`${layoutName}\` not found!`, _factory !== undefined);
        factory = _factory;
      } else {
        return null;
      }
    } else if (isTemplateFactory(layout)) {
      factory = layout;
    } else {
      // no layout was found, use the default layout
      return null;
    }

    return unwrapTemplate(factory(owner)).asWrappedLayout();
  }

  getDynamicLayout(bucket: ComponentStateBucket): CompilableProgram | null {
    return this.templateFor(bucket.component);
  }

  getTagName(state: ComponentStateBucket): Option<string> {
    let { component, hasWrappedElement } = state;

    if (!hasWrappedElement) {
      return null;
    }

    return (component && component.tagName) || 'div';
  }

  getCapabilities(): InternalComponentCapabilities {
    return CURLY_CAPABILITIES;
  }

  prepareArgs(ComponentClass: ComponentFactory, args: VMArguments): Option<PreparedArguments> {
    if (args.named.has('__ARGS__')) {
      assert(
        '[BUG] cannot pass both __ARGS__ and positional arguments',
        args.positional.length === 0
      );

      let { __ARGS__, ...rest } = args.named.capture();
      assert('[BUG] unexpectedly missing __ARGS__ after check', __ARGS__);

      // does this need to be untracked?
      let __args__ = valueForRef(__ARGS__) as CapturedArguments;

      let prepared = {
        positional: __args__.positional,
        named: { ...rest, ...__args__.named },
      };

      return prepared;
    }

    const { positionalParams } = ComponentClass.class ?? ComponentClass;

    // early exits
    if (
      positionalParams === undefined ||
      positionalParams === null ||
      args.positional.length === 0
    ) {
      return null;
    }

    let named: PreparedArguments['named'];

    if (typeof positionalParams === 'string') {
      assert(
        `You cannot specify positional parameters and the hash argument \`${positionalParams}\`.`,
        !args.named.has(positionalParams)
      );
      let captured = args.positional.capture();
      named = {
        [positionalParams]: createComputeRef(() => reifyPositional(captured)),
      };
      Object.assign(named, args.named.capture());
    } else if (Array.isArray(positionalParams) && positionalParams.length > 0) {
      const count = Math.min(positionalParams.length, args.positional.length);
      named = {};
      Object.assign(named, args.named.capture());

      for (let i = 0; i < count; i++) {
        let name = positionalParams[i];
        assert('Expected at least one positional param', name);

        assert(
          `You cannot specify both a positional param (at position ${i}) and the hash argument \`${name}\`.`,
          !args.named.has(name)
        );

        named[name] = args.positional.at(i);
      }
    } else {
      return null;
    }

    return { positional: EMPTY_ARRAY as readonly Reference[], named };
  }

  /*
   * This hook is responsible for actually instantiating the component instance.
   * It also is where we perform additional bookkeeping to support legacy
   * features like exposed by view mixins like ChildViewSupport, ActionSupport,
   * etc.
   */
  create(
    owner: Owner,
    ComponentClass: ComponentFactory,
    args: VMArguments,
    { isInteractive }: Environment,
    dynamicScope: DynamicScope,
    callerSelfRef: Reference,
    hasBlock: boolean
  ): ComponentStateBucket {
    // Get the nearest concrete component instance from the scope. "Virtual"
    // components will be skipped.
    let parentView = dynamicScope.view;

    // Capture the arguments, which tells Glimmer to give us our own, stable
    // copy of the Arguments object that is safe to hold on to between renders.
    let capturedArgs = args.named.capture();

    beginTrackFrame();
    let props = processComponentArgs(capturedArgs);
    let argsTag = endTrackFrame();

    // Alias `id` argument to `elementId` property on the component instance.
    aliasIdToElementId(args, props);

    // Set component instance's parentView property to point to nearest concrete
    // component.
    props.parentView = parentView;

    // Set whether this component was invoked with a block
    // (`{{#my-component}}{{/my-component}}`) or without one
    // (`{{my-component}}`).
    props[HAS_BLOCK] = hasBlock;

    // Save the current `this` context of the template as the component's
    // `_target`, so bubbled actions are routed to the right place.
    props._target = valueForRef(callerSelfRef);

    setOwner(props, owner);

    // caller:
    // <FaIcon @name="bug" />
    //
    // callee:
    // <i class="fa-{{@name}}"></i>

    // Now that we've built up all of the properties to set on the component instance,
    // actually create it.
    beginUntrackFrame();
    let component = ComponentClass.create(props);

    let finalizer = _instrumentStart('render.component', initialRenderInstrumentDetails, component);

    // We become the new parentView for downstream components, so save our
    // component off on the dynamic scope.
    dynamicScope.view = component;

    // Unless we're the root component, we need to add ourselves to our parent
    // component's childViews array.
    if (parentView !== null && parentView !== undefined) {
      addChildView(parentView, component);
    }

    component.trigger('didReceiveAttrs');

    let hasWrappedElement = component.tagName !== '';

    // We usually do this in the `didCreateElement`, but that hook doesn't fire for tagless components
    if (!hasWrappedElement) {
      if (isInteractive) {
        component.trigger('willRender');
      }

      component._transitionTo('hasElement');

      if (isInteractive) {
        component.trigger('willInsertElement');
      }
    }

    // Track additional lifecycle metadata about this component in a state bucket.
    // Essentially we're saving off all the state we'll need in the future.
    let bucket = new ComponentStateBucket(
      component,
      capturedArgs,
      argsTag,
      finalizer,
      hasWrappedElement,
      isInteractive
    );

    if (args.named.has('class')) {
      bucket.classRef = args.named.get('class');
    }

    if (DEBUG) {
      processComponentInitializationAssertions(component, props);
    }

    if (isInteractive && hasWrappedElement) {
      component.trigger('willRender');
    }

    endUntrackFrame();

    // consume every argument so we always run again
    consumeTag(bucket.argsTag);
    consumeTag(component[DIRTY_TAG]);

    return bucket;
  }

  getDebugName(definition: ComponentFactory): string {
    return (
      definition.fullName || definition.normalizedName || definition.class?.name || definition.name
    );
  }

  getSelf({ rootRef }: ComponentStateBucket): Reference {
    return rootRef;
  }

  didCreateElement(
    { component, classRef, isInteractive, rootRef }: ComponentStateBucket,
    element: SimpleElement,
    operations: ElementOperations
  ): void {
    setViewElement(component, element);
    setElementView(element, component);

    let { attributeBindings, classNames, classNameBindings } = component;

    if (attributeBindings && attributeBindings.length) {
      applyAttributeBindings(attributeBindings, component, rootRef, operations);
    } else {
      let id = component.elementId ? component.elementId : guidFor(component);
      operations.setAttribute('id', createPrimitiveRef(id), false, null);
    }

    if (classRef) {
      const ref = createSimpleClassNameBindingRef(classRef);
      operations.setAttribute('class', ref, false, null);
    }

    if (classNames && classNames.length) {
      classNames.forEach((name: string) => {
        operations.setAttribute('class', createPrimitiveRef(name), false, null);
      });
    }

    if (classNameBindings && classNameBindings.length) {
      classNameBindings.forEach((binding: string) => {
        createClassNameBindingRef(rootRef, binding, operations);
      });
    }
    operations.setAttribute('class', EMBER_VIEW_REF, false, null);

    if ('ariaRole' in component) {
      operations.setAttribute('role', childRefFor(rootRef, 'ariaRole'), false, null);
    }

    component._transitionTo('hasElement');

    if (isInteractive) {
      beginUntrackFrame();
      component.trigger('willInsertElement');
      endUntrackFrame();
    }
  }

  didRenderLayout(bucket: ComponentStateBucket, bounds: Bounds): void {
    bucket.component[BOUNDS] = bounds;
    bucket.finalize();
  }

  didCreate({ component, isInteractive }: ComponentStateBucket): void {
    if (isInteractive) {
      component._transitionTo('inDOM');
      component.trigger('didInsertElement');
      component.trigger('didRender');
    }
  }

  update(bucket: ComponentStateBucket): void {
    let { component, args, argsTag, argsRevision, isInteractive } = bucket;

    bucket.finalizer = _instrumentStart('render.component', rerenderInstrumentDetails, component);

    beginUntrackFrame();

    if (args !== null && !validateTag(argsTag, argsRevision)) {
      beginTrackFrame();
      let props = processComponentArgs(args);
      argsTag = bucket.argsTag = endTrackFrame();

      bucket.argsRevision = valueForTag(argsTag);

      component[IS_DISPATCHING_ATTRS] = true;
      component.setProperties(props);
      component[IS_DISPATCHING_ATTRS] = false;

      component.trigger('didUpdateAttrs');
      component.trigger('didReceiveAttrs');
    }

    if (isInteractive) {
      component.trigger('willUpdate');
      component.trigger('willRender');
    }

    endUntrackFrame();

    consumeTag(argsTag);
    consumeTag(component[DIRTY_TAG]);
  }

  didUpdateLayout(bucket: ComponentStateBucket): void {
    bucket.finalize();
  }

  didUpdate({ component, isInteractive }: ComponentStateBucket): void {
    if (isInteractive) {
      component.trigger('didUpdate');
      component.trigger('didRender');
    }
  }

  getDestroyable(bucket: ComponentStateBucket): Option<Destroyable> {
    return bucket;
  }
}

export function processComponentInitializationAssertions(component: Component, props: any): void {
  assert(
    `classNameBindings must be non-empty strings: ${component}`,
    (() => {
      let { classNameBindings } = component;
      for (let i = 0; i < classNameBindings.length; i++) {
        let binding = classNameBindings[i];

        if (typeof binding !== 'string' || binding.length === 0) {
          return false;
        }
      }
      return true;
    })()
  );

  assert(
    `classNameBindings must not have spaces in them: ${component}`,
    (() => {
      let { classNameBindings } = component;
      for (let binding of classNameBindings) {
        if (binding.split(' ').length > 1) {
          return false;
        }
      }
      return true;
    })()
  );

  assert(
    `You cannot use \`classNameBindings\` on a tag-less component: ${component}`,
    component.tagName !== '' ||
      !component.classNameBindings ||
      component.classNameBindings.length === 0
  );

  assert(
    `You cannot use \`elementId\` on a tag-less component: ${component}`,
    component.tagName !== '' ||
      props.id === component.elementId ||
      (!component.elementId && component.elementId !== '')
  );

  assert(
    `You cannot use \`attributeBindings\` on a tag-less component: ${component}`,
    component.tagName !== '' ||
      !component.attributeBindings ||
      component.attributeBindings.length === 0
  );
}

export function initialRenderInstrumentDetails(component: any): any {
  return component.instrumentDetails({ initialRender: true });
}

export function rerenderInstrumentDetails(component: any): any {
  return component.instrumentDetails({ initialRender: false });
}

export const CURLY_CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: true,
  createArgs: true,
  attributeHook: true,
  elementHook: true,
  createCaller: true,
  dynamicScope: true,
  updateHook: true,
  createInstance: true,
  wrapped: true,
  willDestroy: true,
  hasSubOwner: false,
};

export const CURLY_COMPONENT_MANAGER = new CurlyComponentManager();

export function isCurlyManager(manager: object): boolean {
  return manager === CURLY_COMPONENT_MANAGER;
}
