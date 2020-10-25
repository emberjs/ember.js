import { privatize as P } from '@ember/-internals/container';
import { getOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import {
  addChildView,
  EventDispatcher,
  setElementView,
  setViewElement,
} from '@ember/-internals/views';
import { assert, debugFreeze } from '@ember/debug';
import { EMBER_COMPONENT_IS_VISIBLE } from '@ember/deprecated-features';
import { _instrumentStart } from '@ember/instrumentation';
import { assign } from '@ember/polyfills';
import { DEBUG } from '@glimmer/env';
import {
  Bounds,
  ComponentDefinition,
  Destroyable,
  ElementOperations,
  Environment,
  InternalComponentCapabilities,
  Option,
  PreparedArguments,
  Template,
  TemplateFactory,
  VMArguments,
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
import { BaseInternalComponentManager, reifyPositional } from '@glimmer/runtime';
import { EMPTY_ARRAY } from '@glimmer/util';
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
import { BOUNDS, DIRTY_TAG, HAS_BLOCK, IS_DISPATCHING_ATTRS } from '../component';
import { DynamicScope } from '../renderer';
import RuntimeResolver from '../resolver';
import { isTemplateFactory } from '../template';
import {
  createClassNameBindingRef,
  createSimpleClassNameBindingRef,
  installAttributeBinding,
  installIsVisibleBinding,
  parseAttributeBinding,
} from '../utils/bindings';

import ComponentStateBucket, { Component } from '../utils/curly-component-state-bucket';
import { processComponentArgs } from '../utils/process-args';
import DefinitionState from './definition-state';

const EMBER_VIEW_REF = createPrimitiveRef('ember-view');

function aliasIdToElementId(args: VMArguments, props: any) {
  if (args.named.has('id')) {
    // tslint:disable-next-line:max-line-length
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

  if (
    EMBER_COMPONENT_IS_VISIBLE &&
    installIsVisibleBinding !== undefined &&
    seen.indexOf('style') === -1
  ) {
    installIsVisibleBinding(rootRef, operations);
  }
}

const DEFAULT_LAYOUT = P`template:components/-default`;
const EMPTY_POSITIONAL_ARGS: Reference[] = [];

debugFreeze(EMPTY_POSITIONAL_ARGS);

function _setupLazyEventsForComponent(dispatcher: EventDispatcher | undefined, component: object) {
  // non-interactive rendering (e.g. SSR) has no event dispatcher
  if (dispatcher === undefined) {
    return;
  }

  let lazyEvents = dispatcher.lazyEvents;

  lazyEvents.forEach((mappedEventName: string, event: string) => {
    if (mappedEventName !== null && typeof component[mappedEventName] === 'function') {
      dispatcher.setupHandlerForBrowserEvent(event);
    }
  });
}

export default class CurlyComponentManager
  extends BaseInternalComponentManager<ComponentStateBucket, DefinitionState>
  implements
    WithDynamicLayout<ComponentStateBucket, RuntimeResolver>,
    WithDynamicTagName<ComponentStateBucket> {
  protected templateFor(component: Component): Template {
    let { layout, layoutName } = component;
    let owner = getOwner(component);

    let factory: TemplateFactory;

    if (layout === undefined) {
      if (layoutName !== undefined) {
        let _factory = owner.lookup<TemplateFactory>(`template:${layoutName}`);
        assert(`Layout \`${layoutName}\` not found!`, _factory !== undefined);
        factory = _factory!;
      } else {
        factory = owner.lookup<TemplateFactory>(DEFAULT_LAYOUT)!;
      }
    } else if (isTemplateFactory(layout)) {
      factory = layout;
    } else {
      // we were provided an instance already
      return layout;
    }

    return factory(owner);
  }

  getDynamicLayout(bucket: ComponentStateBucket): Template {
    return this.templateFor(bucket.component);
  }

  getTagName(state: ComponentStateBucket): Option<string> {
    let { component, hasWrappedElement } = state;

    if (!hasWrappedElement) {
      return null;
    }

    return (component && component.tagName) || 'div';
  }

  getCapabilities(state: DefinitionState): InternalComponentCapabilities {
    return state.capabilities;
  }

  prepareArgs(state: DefinitionState, args: VMArguments): Option<PreparedArguments> {
    if (args.named.has('__ARGS__')) {
      let { __ARGS__, ...rest } = args.named.capture();

      let prepared = {
        positional: EMPTY_POSITIONAL_ARGS,
        named: {
          ...rest,
          ...(valueForRef(__ARGS__) as { [key: string]: Reference }),
        },
      };

      return prepared;
    }

    const { positionalParams } = state.ComponentClass.class!;

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
      assign(named, args.named.capture());
    } else if (Array.isArray(positionalParams) && positionalParams.length > 0) {
      const count = Math.min(positionalParams.length, args.positional.length);
      named = {};
      assign(named, args.named.capture());

      for (let i = 0; i < count; i++) {
        // As of TS 3.7, tsc is giving us the following error on this line without the type annotation
        //
        //   TS7022: 'name' implicitly has type 'any' because it does not have a type annotation and is
        //   referenced directly or indirectly in its own initializer.
        //
        // This is almost certainly a TypeScript bug, feel free to try and remove the annotation after
        // upgrading if it is not needed anymore.
        const name: string = positionalParams[i];

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
    environment: Environment,
    state: DefinitionState,
    args: VMArguments,
    dynamicScope: DynamicScope,
    callerSelfRef: Reference,
    hasBlock: boolean
  ): ComponentStateBucket {
    // Get the nearest concrete component instance from the scope. "Virtual"
    // components will be skipped.
    let parentView = dynamicScope.view;

    // Get the Ember.Component subclass to instantiate for this component.
    let factory = state.ComponentClass;

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

    // static layout asserts CurriedDefinition
    if (state.template) {
      props.layout = state.template;
    }

    // caller:
    // <FaIcon @name="bug" />
    //
    // callee:
    // <i class="fa-{{@name}}"></i>

    // Now that we've built up all of the properties to set on the component instance,
    // actually create it.
    beginUntrackFrame();
    let component = factory.create(props);

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
      if (environment.isInteractive) {
        component.trigger('willRender');
      }

      component._transitionTo('hasElement');

      if (environment.isInteractive) {
        component.trigger('willInsertElement');
      }
    }

    _setupLazyEventsForComponent(environment.extra.eventDispatcher, component);

    // Track additional lifecycle metadata about this component in a state bucket.
    // Essentially we're saving off all the state we'll need in the future.
    let bucket = new ComponentStateBucket(
      environment,
      component,
      capturedArgs,
      argsTag,
      finalizer,
      hasWrappedElement
    );

    if (args.named.has('class')) {
      bucket.classRef = args.named.get('class');
    }

    if (DEBUG) {
      processComponentInitializationAssertions(component, props);
    }

    if (environment.isInteractive && hasWrappedElement) {
      component.trigger('willRender');
    }

    endUntrackFrame();

    // consume every argument so we always run again
    consumeTag(bucket.argsTag);
    consumeTag(component[DIRTY_TAG]);

    return bucket;
  }

  getDebugName({ name }: DefinitionState): string {
    return name;
  }

  getSelf({ rootRef }: ComponentStateBucket): Reference {
    return rootRef;
  }

  didCreateElement(
    { component, classRef, environment, rootRef }: ComponentStateBucket,
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
      if (EMBER_COMPONENT_IS_VISIBLE) {
        installIsVisibleBinding!(rootRef, operations);
      }
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

    if (environment.isInteractive) {
      beginUntrackFrame();
      component.trigger('willInsertElement');
      endUntrackFrame();
    }
  }

  didRenderLayout(bucket: ComponentStateBucket, bounds: Bounds): void {
    bucket.component[BOUNDS] = bounds;
    bucket.finalize();
  }

  didCreate({ component, environment }: ComponentStateBucket): void {
    if (environment.isInteractive) {
      component._transitionTo('inDOM');
      component.trigger('didInsertElement');
      component.trigger('didRender');
    }
  }

  update(bucket: ComponentStateBucket): void {
    let { component, args, argsTag, argsRevision, environment } = bucket;

    bucket.finalizer = _instrumentStart('render.component', rerenderInstrumentDetails, component);

    beginUntrackFrame();

    if (args !== null && !validateTag(argsTag, argsRevision)) {
      beginTrackFrame();
      let props = processComponentArgs(args!);
      argsTag = bucket.argsTag = endTrackFrame();

      bucket.argsRevision = valueForTag(argsTag);

      component[IS_DISPATCHING_ATTRS] = true;
      component.setProperties(props);
      component[IS_DISPATCHING_ATTRS] = false;

      component.trigger('didUpdateAttrs');
      component.trigger('didReceiveAttrs');
    }

    if (environment.isInteractive) {
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

  didUpdate({ component, environment }: ComponentStateBucket): void {
    if (environment.isInteractive) {
      component.trigger('didUpdate');
      component.trigger('didRender');
    }
  }

  getDestroyable(bucket: ComponentStateBucket): Option<Destroyable> {
    return bucket;
  }
}

export function validatePositionalParameters(
  named: { has(name: string): boolean },
  positional: { length: number },
  positionalParamsDefinition: any
) {
  if (DEBUG) {
    if (!named || !positional || !positional.length) {
      return;
    }

    let paramType = typeof positionalParamsDefinition;

    if (paramType === 'string') {
      // tslint:disable-next-line:max-line-length
      assert(
        `You cannot specify positional parameters and the hash argument \`${positionalParamsDefinition}\`.`,
        !named.has(positionalParamsDefinition)
      );
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
  }
}

export function processComponentInitializationAssertions(component: Component, props: any) {
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
      for (let i = 0; i < classNameBindings.length; i++) {
        let binding = classNameBindings[i];
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

// This is not any of glimmer-vm's proper Argument types because we
// don't have sufficient public constructors to conveniently
// reassemble one after we mangle the various arguments.
interface CurriedArgs {
  positional: any[];
  named: any;
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
};

const CURLY_COMPONENT_MANAGER = new CurlyComponentManager();
export class CurlyComponentDefinition implements ComponentDefinition {
  public state: DefinitionState;
  public manager: CurlyComponentManager = CURLY_COMPONENT_MANAGER;

  constructor(
    public name: string,
    public ComponentClass: any,
    public template?: Template,
    public args?: CurriedArgs
  ) {
    this.state = {
      name,
      ComponentClass,
      template,
      capabilities: CURLY_CAPABILITIES,
    };
  }
}
