import { RehydrateBuilder } from '@glimmer/runtime';
import { SimpleNode } from '@simple-dom/interface';
import { Environment, Cursor, ElementBuilder } from '@glimmer/interfaces';
export declare class DebugRehydrationBuilder extends RehydrateBuilder {
    clearedNodes: SimpleNode[];
    remove(node: SimpleNode): import("@simple-dom/interface").SimpleRawHTMLSection | import("@simple-dom/interface").SimpleElement | import("@simple-dom/interface").SimpleText | import("@simple-dom/interface").SimpleComment | import("@simple-dom/interface").SimpleDocument | import("@simple-dom/interface").SimpleDocumentType | import("@simple-dom/interface").SimpleDocumentFragment | null;
}
export declare function debugRehydration(env: Environment, cursor: Cursor): ElementBuilder;
//# sourceMappingURL=builder.d.ts.map