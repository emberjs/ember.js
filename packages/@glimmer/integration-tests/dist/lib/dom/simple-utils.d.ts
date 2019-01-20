import { SimpleElement, SimpleDocumentFragment, SimpleNode } from '@simple-dom/interface';
import { Option } from '@glimmer/interfaces';
export declare function toInnerHTML(parent: SimpleElement | SimpleDocumentFragment): string;
export declare function toOuterHTML(parent: SimpleElement | SimpleDocumentFragment): string;
export declare function getElementByClassName(element: SimpleElement, className: string): Option<SimpleElement>;
export declare function getElementsByTagName(element: SimpleElement, tagName: string, accum?: SimpleElement[]): SimpleElement[];
export declare function classList(element: SimpleElement): string[];
export declare function toTextContent(parent: SimpleElement): string;
export declare function replaceHTML(parent: SimpleElement, value: string): void;
export declare function assertElement(node: Option<SimpleNode>): SimpleElement;
export declare function hasAttribute(parent: SimpleElement, attr: string): boolean;
export declare function firstElementChild(parent: SimpleElement): Option<SimpleElement>;
export declare function nextElementSibling(node: SimpleNode): Option<SimpleElement>;
export declare function elementId(element: SimpleElement): Option<string>;
//# sourceMappingURL=simple-utils.d.ts.map