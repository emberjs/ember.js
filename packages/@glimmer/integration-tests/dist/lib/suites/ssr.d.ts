import { AbstractNodeTest } from '../modes/node/env';
export declare class ServerSideSuite extends AbstractNodeTest {
    static suiteName: string;
    'HTML text content'(): void;
    'HTML tags'(): void;
    'HTML tags re-rendered'(): void;
    'HTML attributes'(): void;
    'HTML tag with empty attribute'(): void;
    "HTML boolean attribute 'disabled'"(): void;
    'Quoted attribute expression is removed when null'(): void;
    'Unquoted attribute expression with null value is not coerced'(): void;
    'Attribute expression can be followed by another attribute'(): void;
    'HTML tag with data- attribute'(): void;
    'The compiler can handle nesting'(): void;
    'The compiler can handle comments'(): void;
    'The compiler can handle HTML comments with mustaches in them'(): void;
    'The compiler can handle HTML comments with complex mustaches in them'(): void;
    'The compiler can handle HTML comments with multi-line mustaches in them'(): void;
    'The compiler can handle comments with no parent element'(): void;
    'The compiler can handle simple handlebars'(): void;
    'The compiler can handle escaping HTML'(): void;
    'The compiler can handle unescaped HTML'(): void;
    'Unescaped helpers render correctly'(): void;
    'Null literals do not have representation in DOM'(): void;
    'Attributes can be populated with helpers that generate a string'(): void;
    'Elements inside a yielded block'(): void;
    'A simple block helper can return text'(): void;
    'SVG: basic element'(): void;
    'SVG: element with xlink:href'(): void;
}
export declare class ServerSideComponentSuite extends AbstractNodeTest {
    static suiteName: string;
    'can render components'(): void;
    'can render components with yield'(): void;
    'can render components with args'(): void;
    'can render components with block params'(): void;
}
//# sourceMappingURL=ssr.d.ts.map