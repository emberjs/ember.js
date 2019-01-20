import { SimpleElement, SimpleNode } from '@simple-dom/interface';
import { Dict } from '@glimmer/interfaces';
export interface DebugElement {
    element: SimpleElement | null;
    description: string;
}
export declare type EqualsElement = SimpleElement | null | DebugElement;
export declare function equalsElement(input: EqualsElement, tagName: string, attributes: Dict, content: string | null): void;
interface CompatibleTagNameMap extends ElementTagNameMap {
    foreignobject: SVGForeignObjectElement;
}
export declare function assertIsElement(node: SimpleNode | null): node is SimpleElement;
export declare function assertNodeTagName<T extends keyof CompatibleTagNameMap, U extends CompatibleTagNameMap[T]>(node: SimpleNode | null, tagName: T): node is SimpleNode & U;
export declare function equalsAttr(expected: any): Matcher;
export declare function assertEmberishElement(element: SimpleElement, tagName: string, attrs: Object, contents: string): void;
export declare function assertEmberishElement(element: SimpleElement, tagName: string, attrs: Object): void;
export declare function assertEmberishElement(element: SimpleElement, tagName: string, contents: string): void;
export declare function assertEmberishElement(element: SimpleElement, tagName: string): void;
export declare function assertSerializedInElement(result: string, expected: string, message?: string): void;
export declare function classes(expected: string): {
    '3d4ef194-13be-4ccf-8dc7-862eea02c93e': boolean;
    match(actual: string): boolean | "";
    expected(): string;
    fail(actual: string): string;
};
export declare function regex(r: RegExp): {
    '3d4ef194-13be-4ccf-8dc7-862eea02c93e': boolean;
    match(v: string): boolean;
    expected(): string;
    fail(actual: string): string;
};
interface Matcher {
    '3d4ef194-13be-4ccf-8dc7-862eea02c93e': boolean;
    match(actual: any): boolean;
    fail(actual: any): string;
    expected(): string;
}
export declare const MATCHER = "3d4ef194-13be-4ccf-8dc7-862eea02c93e";
export declare function isMatcher(input: unknown): input is Matcher;
/**
  Accomodates the various signatures of `assertEmberishElement` and `assertElement`, which can be any of:

  - element, tagName, attrs, contents
  - element, tagName, contents
  - element, tagName, attrs
  - element, tagName

  TODO: future refactorings should clean up this interface (likely just making all callers pass a POJO)
*/
export declare function processAssertElementArgs(args: any[]): [SimpleElement, string, any, string | null];
export declare function assertElementShape(element: SimpleElement, tagName: string, attrs: Object, contents: string): void;
export declare function assertElementShape(element: SimpleElement, tagName: string, attrs: Object): void;
export declare function assertElementShape(element: SimpleElement, tagName: string, contents: string): void;
export declare function assertElementShape(element: SimpleElement, tagName: string): void;
export {};
//# sourceMappingURL=assertions.d.ts.map