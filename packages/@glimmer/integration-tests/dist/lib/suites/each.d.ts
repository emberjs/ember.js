import { RenderTest } from '../render-test';
export declare class EachSuite extends RenderTest {
    static suiteName: string;
    'basic #each'(): void;
    'keyed #each'(): void;
    'receives the index as the second parameter'(): void;
    'receives the index as the second parameter (when key=@identity)'(): void;
    'it can render duplicate primitive items'(): void;
    'it can render duplicate objects'(): void;
    'it renders all items with duplicate key values'(): void;
    'scoped variable not available outside list'(): void;
    'else template is displayed with context'(): void;
}
//# sourceMappingURL=each.d.ts.map