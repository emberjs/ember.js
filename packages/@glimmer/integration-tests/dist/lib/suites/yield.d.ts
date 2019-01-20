import { RenderTest } from '../render-test';
export declare class YieldSuite extends RenderTest {
    static suiteName: string;
    yield(): void;
    [`yield to "inverse"`](): void;
    [`yield to "else"`](): void;
    'yielding to an non-existent block'(): void;
    'yielding a string and rendering its length'(): void;
    'use a non-existent block param'(): void;
    'block without properties'(): void;
    'yielding true'(): void;
    'yielding false'(): void;
    'yielding null'(): void;
    'yielding undefined'(): void;
    'yielding integers'(): void;
    'yielding floats'(): void;
    'yielding strings'(): void;
    'yield inside a conditional on the component'(): void;
}
//# sourceMappingURL=yield.d.ts.map