import {
  Option,
  CapturedNamedArguments,
  Bounds,
  WithDynamicTagName,
  JitRuntimeResolver,
  WithJitDynamicLayout,
  WithAotStaticLayout,
  ModuleLocator,
  ProgramSymbolTable,
  AotRuntimeResolver,
  Invocation,
  SyntaxCompilationContext,
  Template,
  VMArguments,
  PreparedArguments,
  Environment,
  DynamicScope,
  ElementOperations,
  Destroyable,
  Dict,
} from '@glimmer/interfaces';
import { Attrs, AttrsDiff } from './emberish-glimmer';
import {
  TagWrapper,
  DirtyableTag,
  VersionedPathReference,
  combine,
  UpdatableReference,
  PathReference,
  Tag,
} from '@glimmer/reference';
import { keys, templateMeta, EMPTY_ARRAY, assign } from '@glimmer/util';
import { TestComponentDefinitionState } from './test-component';
import { PrimitiveReference } from '@glimmer/runtime';

export interface EmberishCurlyComponentFactory {
  fromDynamicScope?: string[];
  positionalParams: Option<string | string[]>;
  create(options: { attrs: Attrs; targetObject: any }): EmberishCurlyComponent;
}

let GUID = 1;

export class EmberishCurlyComponent {
  public static positionalParams: string[] | string = [];

  public dirtinessTag: TagWrapper<DirtyableTag> = DirtyableTag.create();
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

  static create(args: { attrs: Attrs }): EmberishCurlyComponent {
    let c = new EmberishCurlyComponent();

    for (let key of keys(args)) {
      c[key] = args[key];
    }

    return c;
  }

  constructor() {
    this._guid = `ember${GUID++}`;
  }

  set(key: string, value: unknown) {
    (this as Dict)[key] = value;
  }

  setProperties(dict: Dict) {
    for (let key of keys(dict)) {
      (this as Dict)[key] = dict[key];
    }
  }

  recompute() {
    this.dirtinessTag.inner.dirty();
  }

  destroy() {}

  didInitAttrs(_options: { attrs: Attrs }) {}
  didUpdateAttrs(_diff: AttrsDiff) {}
  didReceiveAttrs(_diff: AttrsDiff) {}
  willInsertElement() {}
  willUpdate() {}
  willRender() {}
  didInsertElement() {}
  didUpdate() {}
  didRender() {}
}

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
    WithJitDynamicLayout<EmberishCurlyComponent, JitRuntimeResolver>,
    WithAotStaticLayout<
      EmberishCurlyComponent,
      EmberishCurlyComponentDefinitionState,
      AotRuntimeResolver
    > {
  getCapabilities(state: TestComponentDefinitionState) {
    return state.capabilities;
  }

  getAotStaticLayout(
    state: EmberishCurlyComponentDefinitionState,
    resolver: AotRuntimeResolver
  ): Invocation {
    return resolver.getInvocation(templateMeta(state.locator));
  }

  getJitDynamicLayout(
    { layout }: EmberishCurlyComponent,
    resolver: JitRuntimeResolver,
    { program: { resolverDelegate } }: SyntaxCompilationContext
  ): Template {
    if (!layout) {
      throw new Error('BUG: missing dynamic layout');
    }

    // TODO: What's going on with this weird resolve?
    let source = (resolver.resolve(layout.handle) as unknown) as string;

    if (source === null) {
      throw new Error(`BUG: Missing dynamic layout for ${layout.name}`);
    }

    return resolverDelegate.compile(source, layout.name);
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

      let named = Object.assign({}, args.named.capture().map);
      named[positionalParams] = args.positional.capture();

      return { positional: EMPTY_ARRAY, named };
    } else if (Array.isArray(positionalParams)) {
      let named = Object.assign({}, args.named.capture().map);
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
    callerSelf: VersionedPathReference,
    hasDefaultBlock: boolean
  ): EmberishCurlyComponent {
    let klass = state.ComponentClass || EmberishCurlyComponent;
    let self = callerSelf.value();
    let args = _args.named.capture();
    let attrs = args.value();
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

    component.didInitAttrs({ attrs });
    component.didReceiveAttrs({ oldAttrs: null, newAttrs: attrs });
    component.willInsertElement();
    component.willRender();

    return component;
  }

  getTag({ args: { tag }, dirtinessTag }: EmberishCurlyComponent): Tag {
    return combine([tag, dirtinessTag]);
  }

  getSelf(component: EmberishCurlyComponent): PathReference<unknown> {
    return new UpdatableReference(component);
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
    let rootRef = new UpdatableReference(component);

    if (bindings) {
      for (let i = 0; i < bindings.length; i++) {
        let attribute = bindings[i];
        let reference = rootRef.get(attribute) as PathReference<string>;

        operations.setAttribute(attribute, reference, false, null);
      }
    }
  }

  didRenderLayout(component: EmberishCurlyComponent, bounds: Bounds): void {
    component.bounds = bounds;
  }

  didCreate(component: EmberishCurlyComponent): void {
    component.didInsertElement();
    component.didRender();
  }

  update(component: EmberishCurlyComponent): void {
    let oldAttrs = component.attrs;
    let newAttrs = component.args.value();
    let merged = assign({}, newAttrs, { attrs: newAttrs });

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

  getDestructor(component: EmberishCurlyComponent): Destroyable {
    return {
      destroy() {
        component.destroy();
      },
    };
  }
}
