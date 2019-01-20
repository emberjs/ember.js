import { AbstractNodeTest, NodeJitRenderDelegate, NodeAotRenderDelegate } from '../modes/node/env';
import { RenderTest } from '../render-test';
import { Environment, Cursor } from '@glimmer/interfaces';
export declare class DOMHelperTests extends AbstractNodeTest {
    static suiteName: string;
    'can instantiate NodeDOMTreeConstruction without a document'(): void;
}
export declare class CompilationTests extends RenderTest {
    static suiteName: string;
    'generates id in node'(): void;
}
export declare class JitSerializationDelegate extends NodeJitRenderDelegate {
    static style: string;
    getElementBuilder(env: Environment, cursor: Cursor): import("@glimmer/interfaces").ElementBuilder;
}
export declare class AotSerializationDelegate extends NodeAotRenderDelegate {
    getElementBuilder(env: Environment, cursor: Cursor): import("@glimmer/interfaces").ElementBuilder;
}
export declare class SerializedDOMHelperTests extends DOMHelperTests {
    static suiteName: string;
    'The compiler can handle unescaped HTML'(): void;
    'Unescaped helpers render correctly'(): void;
    'Null literals do not have representation in DOM'(): void;
    'Elements inside a yielded block'(): void;
    'A simple block helper can return text'(): void;
    assertHTML(html: string): void;
}
//# sourceMappingURL=custom-dom-helper.d.ts.map