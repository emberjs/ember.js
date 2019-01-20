import { TagWrapper, PathReference, Tag, UpdatableDirtyableTag } from '@glimmer/reference';
import { Dict, Option, Bounds, CapturedNamedArguments, ComponentManager, WithJitStaticLayout, JitRuntimeResolver, AotRuntimeResolver, WithAotStaticLayout, ComponentCapabilities, Environment, VMArguments, DynamicScope, CompilableProgram, Invocation, Destroyable } from '@glimmer/interfaces';
import { TestComponentDefinitionState } from './test-component';
import { TestComponentConstructor } from './types';
import { EmberishCurlyComponentFactory } from './emberish-curly';
export declare type Attrs = Dict;
export declare type AttrsDiff = {
    oldAttrs: Option<Attrs>;
    newAttrs: Attrs;
};
export declare type EmberishGlimmerArgs = {
    attrs: Attrs;
};
export declare class EmberishGlimmerComponent {
    dirtinessTag: TagWrapper<UpdatableDirtyableTag>;
    attrs: Attrs;
    element: Element;
    bounds: Bounds;
    parentView: Option<EmberishGlimmerComponent>;
    static create({ attrs: args }: EmberishGlimmerArgs): EmberishGlimmerComponent;
    constructor(_args: EmberishGlimmerArgs);
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
export interface EmberishGlimmerComponentFactory extends TestComponentConstructor<EmberishGlimmerComponent> {
    create(options: {
        attrs: Attrs;
    }): EmberishGlimmerComponent;
}
export declare const EMBERISH_GLIMMER_CAPABILITIES: ComponentCapabilities & {
    dynamicTag: boolean;
    createArgs: boolean;
    attributeHook: boolean;
    updateHook: boolean;
    createInstance: boolean;
};
export interface EmberishGlimmerComponentState {
    args: CapturedNamedArguments;
    component: EmberishGlimmerComponent;
}
export declare class EmberishGlimmerComponentManager implements ComponentManager<EmberishGlimmerComponentState, TestComponentDefinitionState>, WithJitStaticLayout<EmberishGlimmerComponentState, TestComponentDefinitionState, JitRuntimeResolver>, WithAotStaticLayout<EmberishGlimmerComponentState, TestComponentDefinitionState, AotRuntimeResolver> {
    getCapabilities(state: TestComponentDefinitionState): ComponentCapabilities;
    prepareArgs(): null;
    create(_environment: Environment, definition: TestComponentDefinitionState, _args: VMArguments, _dynamicScope: DynamicScope, _callerSelf: PathReference<unknown>, _hasDefaultBlock: boolean): EmberishGlimmerComponentState;
    getTag({ args: { tag }, component }: EmberishGlimmerComponentState): Tag;
    getJitStaticLayout(state: TestComponentDefinitionState, resolver: JitRuntimeResolver): CompilableProgram;
    getAotStaticLayout(state: TestComponentDefinitionState, resolver: AotRuntimeResolver): Invocation;
    getSelf({ component }: EmberishGlimmerComponentState): PathReference<unknown>;
    didCreateElement(): void;
    didRenderLayout({ component }: EmberishGlimmerComponentState, bounds: Bounds): void;
    didCreate({ component }: EmberishGlimmerComponentState): void;
    update({ args, component }: EmberishGlimmerComponentState): void;
    didUpdateLayout(): void;
    didUpdate({ component }: EmberishGlimmerComponentState): void;
    getDestructor({ component }: EmberishGlimmerComponentState): Destroyable;
}
export interface ComponentHooks {
    didInitAttrs: number;
    didUpdateAttrs: number;
    didReceiveAttrs: number;
    willInsertElement: number;
    willUpdate: number;
    willRender: number;
    didInsertElement: number;
    didUpdate: number;
    didRender: number;
}
export interface HookedComponent {
    hooks: ComponentHooks;
}
export declare function inspectHooks<T extends EmberishCurlyComponentFactory | EmberishGlimmerComponentFactory>(ComponentClass: T): T;
//# sourceMappingURL=emberish-glimmer.d.ts.map