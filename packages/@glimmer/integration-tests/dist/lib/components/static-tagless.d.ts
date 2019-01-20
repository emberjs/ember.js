import { BasicComponentManager } from './basic';
import { TestComponentDefinitionState } from './test-component';
import { ComponentCapabilities, CompilableProgram, Option } from '@glimmer/interfaces';
import TestJitRuntimeResolver from '../modes/jit/resolver';
export declare class StaticTaglessComponentManager extends BasicComponentManager {
    getCapabilities(state: TestComponentDefinitionState): ComponentCapabilities;
    getJitStaticLayout(state: TestComponentDefinitionState, resolver: TestJitRuntimeResolver): CompilableProgram;
}
export interface StaticTaglessComponentDefinitionState {
    name: string;
    layout: Option<number>;
    ComponentClass: any;
}
//# sourceMappingURL=static-tagless.d.ts.map