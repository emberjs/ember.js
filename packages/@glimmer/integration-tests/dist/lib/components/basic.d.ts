import { Bounds, WithJitStaticLayout, WithAotStaticLayout, AotRuntimeResolver, JitRuntimeResolver, Environment, CompilableProgram, Invocation, ComponentCapabilities } from '@glimmer/interfaces';
import { TestComponentDefinitionState } from './test-component';
import { VersionedPathReference, Tag } from '@glimmer/reference';
export interface BasicComponentFactory {
    new (): BasicComponent;
}
export declare class BasicComponent {
    element: Element;
    bounds: Bounds;
}
export declare class BasicComponentManager implements WithJitStaticLayout<BasicComponent, TestComponentDefinitionState, JitRuntimeResolver>, WithAotStaticLayout<BasicComponent, TestComponentDefinitionState, AotRuntimeResolver> {
    getCapabilities(state: TestComponentDefinitionState): ComponentCapabilities;
    prepareArgs(): null;
    create(_env: Environment, definition: TestComponentDefinitionState): BasicComponent;
    getJitStaticLayout(state: TestComponentDefinitionState, resolver: JitRuntimeResolver): CompilableProgram;
    getAotStaticLayout(state: TestComponentDefinitionState, resolver: AotRuntimeResolver): Invocation;
    getSelf(component: BasicComponent): VersionedPathReference;
    getTag(): Tag;
    didCreateElement(component: BasicComponent, element: Element): void;
    didRenderLayout(component: BasicComponent, bounds: Bounds): void;
    didCreate(): void;
    update(): void;
    didUpdateLayout(): void;
    didUpdate(): void;
    getDestructor(): null;
}
//# sourceMappingURL=basic.d.ts.map