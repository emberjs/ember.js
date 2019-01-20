import { IRenderTest } from '../render-test';
import RenderDelegate from '../render-delegate';
import { SimpleDocument } from '@simple-dom/interface';
export interface RenderTestConstructor<D extends RenderDelegate, T extends IRenderTest> {
    suiteName: string;
    new (delegate: D): T;
}
export declare function jitSuite<T extends IRenderTest>(klass: RenderTestConstructor<RenderDelegate, T>, options?: {
    componentModule: boolean;
}): void;
export declare function nodeSuite<T extends IRenderTest>(klass: RenderTestConstructor<RenderDelegate, T>, options?: {
    componentModule: boolean;
}): void;
export declare function nodeComponentSuite<T extends IRenderTest>(klass: RenderTestConstructor<RenderDelegate, T>): void;
export declare function jitComponentSuite<T extends IRenderTest>(klass: RenderTestConstructor<RenderDelegate, T>): void;
export declare function aotSuite<T extends IRenderTest>(klass: RenderTestConstructor<RenderDelegate, T>, options?: {
    componentModule: boolean;
}): void;
export declare function aotComponentSuite<T extends IRenderTest>(klass: RenderTestConstructor<RenderDelegate, T>): void;
export declare function jitSerializeSuite<T extends IRenderTest>(klass: RenderTestConstructor<RenderDelegate, T>, options?: {
    componentModule: boolean;
}): void;
export declare function aotSerializeSuite<T extends IRenderTest>(klass: RenderTestConstructor<RenderDelegate, T>, options?: {
    componentModule: boolean;
}): void;
export interface RenderDelegateConstructor<Delegate extends RenderDelegate> {
    readonly isEager: boolean;
    readonly style: string;
    new (doc?: SimpleDocument): Delegate;
}
export declare function componentSuite<D extends RenderDelegate>(klass: RenderTestConstructor<D, IRenderTest>, Delegate: RenderDelegateConstructor<D>): void;
export declare function suite<D extends RenderDelegate>(klass: RenderTestConstructor<D, IRenderTest>, Delegate: RenderDelegateConstructor<D>, options?: {
    componentModule: boolean;
}): void;
//# sourceMappingURL=module.d.ts.map