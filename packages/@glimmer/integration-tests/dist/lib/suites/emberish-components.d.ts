/// <reference types="qunit" />
import { RenderTest, Count } from '../render-test';
export declare class EmberishComponentTests extends RenderTest {
    static suiteName: string;
    '[BUG: #644 popping args should be balanced]'(): void;
    '[BUG] Gracefully handles application of curried args when invoke starts with 0 args'(): void;
    'Static block component helper'(): void;
    'Static inline component helper'(): void;
    'top level in-element'(): void;
    'recursive component invocation'(): void;
    'Element modifier with hooks'(assert: Assert, count: Count): void;
    'non-block without properties'(): void;
    'block without properties'(): void;
    'yield inside a conditional on the component'(): void;
    'non-block with properties on attrs'(): void;
    'block with properties on attrs'(): void;
    'with ariaRole specified'(): void;
    'with ariaRole and class specified'(): void;
    'with ariaRole specified as an outer binding'(): void;
    'glimmer component with role specified as an outer binding and copied'(): void;
    'invoking wrapped layout via angle brackets applies ...attributes'(): void;
    'invoking wrapped layout via angle brackets - invocation attributes clobber internal attributes'(): void;
    'invoking wrapped layout via angle brackets - invocation attributes merges classes'(): void;
    'invoking wrapped layout via angle brackets also applies explicit ...attributes'(): void;
}
//# sourceMappingURL=emberish-components.d.ts.map