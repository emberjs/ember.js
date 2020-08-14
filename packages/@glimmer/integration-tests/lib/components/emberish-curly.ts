import {
  Option,
  CapturedNamedArguments,
  Bounds,
  WithDynamicTagName,
  WithJitDynamicLayout,
  WithAotStaticLayout,
  ModuleLocator,
  ProgramSymbolTable,
  AotRuntimeResolver,
  Invocation,
  Template,
  VMArguments,
  PreparedArguments,
  Environment,
  DynamicScope,
  ElementOperations,
  Destroyable,
  Dict,
  ComponentCapabilities,
  JitRuntimeResolver,
} from '@glimmer/interfaces';
import { Attrs, AttrsDiff } from './emberish-glimmer';
import { PathReference } from '@glimmer/reference';
import { createTag, dirtyTag, DirtyableTag, consumeTag, dirtyTagFor } from '@glimmer/validator';
import { keys, EMPTY_ARRAY, assign } from '@glimmer/util';
import { TestComponentDefinitionState } from './test-component';
import {
  PrimitiveReference,
  registerDestructor,
  reifyNamed,
  ReifyPositionalReference,
} from '@glimmer/runtime';
import { TestComponentConstructor } from './types';
import TestJitRuntimeResolver from '../modes/jit/resolver';
import { TestJitRegistry } from '../modes/jit/registry';
import { UpdatableRootReference } from '../reference';

export interface EmberishCurlyComponentFactory
  extends TestComponentConstructor<EmberishCurlyComponent> {
  fromDynamicScope?: string[];
  positionalParams: string | string[];
  create(options: { attrs: Attrs; targetObject: any }): EmberishCurlyComponent;
  new (...args: unknown[]): this;
}

let GUID = 1;

export class EmberishCurlyComponent {
  public static positionalParams: string[] | string = [];

  public dirtinessTag: DirtyableTag = createTag();
  public layout!: { name: string; handle: number };
  public name!: string;
  public tagName: Option<string> = null;
  public attributeBindings: Option<string[]> = null;
  public attrs!: Attrs;
  public element!: Element;
  public bounds!: Bounds;
  public parentView: Option<EmberishCurlyComponent> = null;
  public args!: CapturedNamedArguments;

  public _guid: string;

  // create(options: { attrs: Attrs; targetObject: any }): EmberishCurlyComponent

  static create(args: { attrs: Attrs; targetObject: any }): EmberishCurlyComponent {
    let c = new this();

    for (let key of keys(args)) {
      (c as any)[key] = args[key];
    }

    return c;
  }

  init() {}

  constructor() {
    this._guid = `${GUID++}`;
    this.init();
  }

  set(key: string, value: unknown) {
    (this as any)[key] = value;
    dirtyTagFor(this, key as string);
  }

  setProperties(dict: Dict) {
    for (let key of keys(dict)) {
      this.set(key as string, dict[key]);
    }
  }

  recompute() {
    dirtyTag(this.dirtinessTag);
  }

  destroy() {}

  didInitAttrs(_options: { attrs: Attrs }) {}
  didUpdateAttrs(_diff: AttrsDiff) {}
  didReceiveAttrs(_diff: AttrsDiff) {}
  willInsertElement() {}
  willDestroyElement() {}
  willUpdate() {}
  willRender() {}
  didInsertElement() {}
  didUpdate() {}
  didRender() {}
}

const SELF_REF = new WeakMap<object, UpdatableRootReference>();

export interface EmberishCurlyComponentDefinitionState {
  name: string;
  ComponentClass: EmberishCurlyComponentFactory;
  locator: ModuleLocator;
  layout: Option<number>;
  symbolTable?: ProgramSymbolTable;
}

export class EmberishCurlyComponentManager
  implements
    WithDynamicTagName<EmberishCurlyComponent>,
    WithJitDynamicLayout<EmberishCurlyComponent, TestJitRuntimeResolver>,
    WithAotStaticLayout<
      EmberishCurlyComponent,
      EmberishCurlyComponentDefinitionState,
      AotRuntimeResolver
    > {
  constructor(private registry?: TestJitRegistry) {}

  getDebugName(state: TestComponentDefinitionState) {
    return state.name;
  }

  getCapabilities(state: TestComponentDefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  getAotStaticLayout(
    state: EmberishCurlyComponentDefinitionState,
    resolver: AotRuntimeResolver
  ): Invocation {
    return resolver.getInvocation(state.locator);
  }

  getJitDynamicLayout({ layout }: EmberishCurlyComponent, resolver: JitRuntimeResolver): Template {
    if (!this.registry) {
      throw new Error(
        'BUG: Must provide a test registry to component managers when attempting to lookup component layouts dynamically'
      );
    }

    if (!layout) {
      throw new Error('BUG: missing dynamic layout');
    }

    // TODO: What's going on with this weird resolve?
    let source = (resolver.resolve(layout.handle) as unknown) as string;

    if (source === null) {
      throw new Error(`BUG: Missing dynamic layout for ${layout.name}`);
    }

    return this.registry.templateFromSource(source, layout.name);
  }

  prepareArgs(
    state: EmberishCurlyComponentDefinitionState,
    args: VMArguments
  ): Option<PreparedArguments> {
    const { positionalParams } = state.ComponentClass || EmberishCurlyComponent;
    if (typeof positionalParams === 'string') {
      if (args.named.has(positionalParams)) {
        if (args.positional.length === 0) {
          return null;
        } else {
          throw new Error(
            `You cannot specify positional parameters and the hash argument \`${positionalParams}\`.`
          );
        }
      }

      let named = args.named.capture();
      let positional = args.positional.capture();
      named[positionalParams] = new ReifyPositionalReference(positional);

      return { positional: EMPTY_ARRAY, named };
    } else if (Array.isArray(positionalParams)) {
      let named = assign({}, args.named.capture());
      let count = Math.min(positionalParams.length, args.positional.length);

      for (let i = 0; i < count; i++) {
        let name = positionalParams[i];

        if (named[name]) {
          throw new Error(
            `You cannot specify both a positional param (at position ${i}) and the hash argument \`${name}\`.`
          );
        }

        named[name] = args.positional.at(i);
      }

      return { positional: EMPTY_ARRAY, named };
    } else {
      return null;
    }
  }

  create(
    _environment: Environment,
    state: EmberishCurlyComponentDefinitionState,
    _args: VMArguments,
    dynamicScope: DynamicScope,
    callerSelf: PathReference,
    hasDefaultBlock: boolean
  ): EmberishCurlyComponent {
    let klass = state.ComponentClass || EmberishCurlyComponent;
    let self = callerSelf.value();
    let args = _args.named.capture();
    let attrs = reifyNamed(args);
    let merged = assign(
      {},
      attrs,
      { attrs },
      { args },
      { targetObject: self },
      { HAS_BLOCK: hasDefaultBlock }
    );
    let component = klass.create(merged);

    component.name = state.name;
    component.args = args;

    if (state.layout !== null) {
      component.layout = { name: component.name, handle: state.layout };
    }

    let dyn: Option<string[]> = state.ComponentClass
      ? state.ComponentClass['fromDynamicScope'] || null
      : null;

    if (dyn) {
      for (let i = 0; i < dyn.length; i++) {
        let name = dyn[i];
        component.set(name, dynamicScope.get(name).value());
      }
    }

    consumeTag(component.dirtinessTag);

    component.didInitAttrs({ attrs });
    component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    component.willInsertElement();
    component.willRender();

    registerDestructor(component, () => component.destroy());

    return component;
  }

  getSelf(component: EmberishCurlyComponent): PathReference<unknown> {
    let ref = new UpdatableRootReference(component);
    SELF_REF.set(component, ref);
    return ref;
  }

  getTagName({ tagName }: EmberishCurlyComponent): Option<string> {
    if (tagName) {
      return tagName;
    } else if (tagName === null) {
      return 'div';
    } else {
      return null;
    }
  }

  didCreateElement(
    component: EmberishCurlyComponent,
    element: Element,
    operations: ElementOperations
  ): void {
    component.element = element;

    operations.setAttribute(
      'id',
      PrimitiveReference.create(`ember${component._guid}`),
      false,
      null
    );
    operations.setAttribute('class', PrimitiveReference.create('ember-view'), false, null);

    let bindings = component.attributeBindings;
    let rootRef = SELF_REF.get(component)!;

    if (bindings) {
      for (let i = 0; i < bindings.length; i++) {
        let attribute = bindings[i];
        let reference = rootRef.get(attribute);

        operations.setAttribute(attribute, reference, false, null);
      }
    }
  }

  didRenderLayout(component: EmberishCurlyComponent, bounds: Bounds): void {
    component.bounds = bounds;
  }

  didCreate(component: EmberishCurlyComponent): void {
    component.didInsertElement();
    registerDestructor(component, () => component.willDestroyElement(), true);

    component.didRender();
  }

  update(component: EmberishCurlyComponent): void {
    let oldAttrs = component.attrs;
    let newAttrs = reifyNamed(component.args);
    let merged = assign({}, newAttrs, { attrs: newAttrs });

    consumeTag(component.dirtinessTag);

    component.setProperties(merged);
    component.didUpdateAttrs({ oldAttrs, newAttrs });
    component.didReceiveAttrs({ oldAttrs, newAttrs });
    component.willUpdate();
    component.willRender();
  }

  didUpdateLayout(): void {}

  didUpdate(component: EmberishCurlyComponent): void {
    component.didUpdate();
    component.didRender();
  }

  getDestroyable(component: EmberishCurlyComponent): Destroyable {
    return component;
  }
}
