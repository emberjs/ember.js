import { RenderTest } from '../render-test';
export declare class FragmentComponents extends RenderTest {
    static suiteName: string;
    'creating a new component'(): void;
    'inner ...attributes'(): void;
}
export declare class BasicComponents extends RenderTest {
    static suiteName: string;
    'creating a new component'(): void;
    'creating a new component passing args'(): void;
    'creating a new component passing named blocks'(): void;
    'creating a new component passing named blocks that take block params'(): void;
    'creating a new component passing dynamic args'(): void;
    'creating a new component yielding values'(): void;
    'invoking dynamic component (named arg) via angle brackets'(): void;
    'invoking dynamic component (named arg path) via angle brackets'(): void;
    'invoking curried component with attributes via angle brackets (invocation attributes clobber)'(): void;
    'invoking curried component with attributes via angle brackets (invocation classes merge)'(): void;
    'invoking dynamic component (named arg) via angle brackets supports attributes (invocation attributes clobber)'(): void;
    'invoking dynamic component (named arg) via angle brackets supports attributes'(): void;
    'invoking dynamic component (named arg) via angle brackets supports args'(): void;
    'invoking dynamic component (named arg) via angle brackets supports passing a block'(): void;
    'invoking dynamic component (named arg) via angle brackets supports args and attributes'(): void;
    'invoking dynamic component (local) via angle brackets'(): void;
    'invoking dynamic component (local path) via angle brackets'(): void;
    'invoking dynamic component (local) via angle brackets (ill-advised "htmlish element name" but supported)'(): void;
    'invoking dynamic component (local) via angle brackets supports attributes'(): void;
    'invoking dynamic component (local) via angle brackets supports args'(): void;
    'invoking dynamic component (local) via angle brackets supports passing a block'(): void;
    'invoking dynamic component (local) via angle brackets supports args, attributes, and blocks'(): void;
    'invoking dynamic component (path) via angle brackets'(): void;
    'invoking dynamic component (path) via angle brackets does not support implicit `this` fallback'(): void;
    'invoking dynamic component (path) via angle brackets supports attributes'(): void;
    'invoking dynamic component (path) via angle brackets supports args'(): void;
    'invoking dynamic component (path) via angle brackets supports passing a block'(): void;
    'invoking dynamic component (path) via angle brackets supports args, attributes, and blocks'(): void;
    'angle bracket invocation can pass forward ...attributes to a nested component'(): void;
}
//# sourceMappingURL=components.d.ts.map