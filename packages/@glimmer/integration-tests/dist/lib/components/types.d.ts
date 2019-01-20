import { EmberishGlimmerComponent } from './emberish-glimmer';
import { EmberishCurlyComponent } from './emberish-curly';
import { BasicComponent } from './basic';
export declare type ComponentKind = 'Glimmer' | 'Curly' | 'Dynamic' | 'Basic' | 'Fragment';
export interface TestComponentConstructor<T> {
    new (): T;
}
export interface ComponentTypes {
    Glimmer: typeof EmberishGlimmerComponent;
    Curly: TestComponentConstructor<EmberishCurlyComponent>;
    Dynamic: TestComponentConstructor<EmberishCurlyComponent>;
    Basic: TestComponentConstructor<BasicComponent>;
    Fragment: TestComponentConstructor<BasicComponent>;
}
export interface ComponentBlueprint {
    layout: string;
    tag?: string;
    else?: string;
    template?: string;
    name?: string;
    args?: Object;
    attributes?: Object;
    layoutAttributes?: Object;
    blockParams?: string[];
}
export declare const GLIMMER_TEST_COMPONENT = "TestComponent";
export declare const CURLY_TEST_COMPONENT = "test-component";
//# sourceMappingURL=types.d.ts.map