import { Option, CapturedNamedArguments, Bounds, WithDynamicTagName, JitRuntimeResolver, WithJitDynamicLayout, WithAotStaticLayout, ModuleLocator, ProgramSymbolTable, AotRuntimeResolver, Invocation, SyntaxCompilationContext, Template, VMArguments, PreparedArguments, Environment, DynamicScope, ElementOperations, Destroyable, Dict, ComponentCapabilities } from '@glimmer/interfaces';
import { Attrs, AttrsDiff } from './emberish-glimmer';
import { TagWrapper, DirtyableTag, VersionedPathReference, PathReference, Tag } from '@glimmer/reference';
import { TestComponentDefinitionState } from './test-component';
import { TestComponentConstructor } from './types';
export interface EmberishCurlyComponentFactory extends TestComponentConstructor<EmberishCurlyComponent> {
    fromDynamicScope?: string[];
    positionalParams: Option<string | string[]>;
    create(options: {
        attrs: Attrs;
        targetObject: any;
    }): EmberishCurlyComponent;
}
export declare class EmberishCurlyComponent {
    static positionalParams: string[] | string;
    dirtinessTag: TagWrapper<DirtyableTag>;
    layout: {
        name: string;
        handle: number;
    };
    name: string;
    tagName: Option<string>;
    attributeBindings: Option<string[]>;
    attrs: Attrs;
    element: Element;
    bounds: Bounds;
    parentView: Option<EmberishCurlyComponent>;
    args: CapturedNamedArguments;
    _guid: string;
    static create(args: {
        attrs: Attrs;
    }): EmberishCurlyComponent;
    constructor();
    set(key: string, value: unknown): void;
    setProperties(dict: Dict): void;
    recompute(): void;
    destroy(): void;
    didInitAttrs(_options: {
        attrs: Attrs;
    }): void;
    didUpdateAttrs(_diff: AttrsDiff): void;
    didReceiveAttrs(_diff: AttrsDiff): void;
    willInsertElement(): void;
    willUpdate(): void;
    willRender(): void;
    didInsertElement(): void;
    didUpdate(): void;
    didRender(): void;
}
export interface EmberishCurlyComponentDefinitionState {
    name: string;
    ComponentClass: EmberishCurlyComponentFactory;
    locator: ModuleLocator;
    layout: Option<number>;
    symbolTable?: ProgramSymbolTable;
}
export declare class EmberishCurlyComponentManager implements WithDynamicTagName<EmberishCurlyComponent>, WithJitDynamicLayout<EmberishCurlyComponent, JitRuntimeResolver>, WithAotStaticLayout<EmberishCurlyComponent, EmberishCurlyComponentDefinitionState, AotRuntimeResolver> {
    getCapabilities(state: TestComponentDefinitionState): ComponentCapabilities;
    getAotStaticLayout(state: EmberishCurlyComponentDefinitionState, resolver: AotRuntimeResolver): Invocation;
    getJitDynamicLayout({ layout }: EmberishCurlyComponent, resolver: JitRuntimeResolver, { program: { resolverDelegate } }: SyntaxCompilationContext): Template;
    prepareArgs(state: EmberishCurlyComponentDefinitionState, args: VMArguments): Option<PreparedArguments>;
    create(_environment: Environment, state: EmberishCurlyComponentDefinitionState, _args: VMArguments, dynamicScope: DynamicScope, callerSelf: VersionedPathReference, hasDefaultBlock: boolean): EmberishCurlyComponent;
    getTag({ args: { tag }, dirtinessTag }: EmberishCurlyComponent): Tag;
    getSelf(component: EmberishCurlyComponent): PathReference<unknown>;
    getTagName({ tagName }: EmberishCurlyComponent): Option<string>;
    didCreateElement(component: EmberishCurlyComponent, element: Element, operations: ElementOperations): void;
    didRenderLayout(component: EmberishCurlyComponent, bounds: Bounds): void;
    didCreate(component: EmberishCurlyComponent): void;
    update(component: EmberishCurlyComponent): void;
    didUpdateLayout(): void;
    didUpdate(component: EmberishCurlyComponent): void;
    getDestructor(component: EmberishCurlyComponent): Destroyable;
}
//# sourceMappingURL=emberish-curly.d.ts.map