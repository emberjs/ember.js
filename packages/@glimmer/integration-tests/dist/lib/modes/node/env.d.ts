import { GlimmerTreeChanges, GlimmerTreeConstruction } from '@glimmer/interfaces';
import { SimpleDocument } from '@simple-dom/interface';
import { JitRenderDelegate } from '../jit/delegate';
import { AotRenderDelegate } from '../aot/delegate';
import { RenderTest } from '../../render-test';
import RenderDelegate from '../../render-delegate';
export interface NodeEnvironmentOptions {
    document: SimpleDocument;
    appendOperations?: GlimmerTreeConstruction;
    updateOperations?: GlimmerTreeChanges;
}
export declare class NodeJitRenderDelegate extends JitRenderDelegate {
    static style: string;
    constructor();
}
export declare class NodeAotRenderDelegate extends AotRenderDelegate {
    static style: string;
    constructor();
}
export declare class AbstractNodeTest extends RenderTest {
    constructor(delegate: RenderDelegate);
    assertHTML(html: string): void;
    assertComponent(html: string): void;
}
export declare class NodeRenderDelegate extends AotRenderDelegate {
    constructor(doc?: SimpleDocument);
}
//# sourceMappingURL=env.d.ts.map