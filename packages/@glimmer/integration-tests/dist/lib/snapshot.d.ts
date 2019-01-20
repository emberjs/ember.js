import { SimpleNode, SimpleElement } from '@simple-dom/interface';
import { Option } from '@glimmer/interfaces';
export declare type IndividualSnapshot = 'up' | 'down' | SimpleNode;
export declare type NodesSnapshot = IndividualSnapshot[];
export declare function snapshotIsNode(snapshot: IndividualSnapshot): snapshot is SimpleNode;
export declare function equalTokens(testFragment: SimpleElement | string | null, testHTML: SimpleElement | string, message?: Option<string>): void;
export declare function generateSnapshot(element: SimpleElement): SimpleNode[];
export declare function equalSnapshots(a: SimpleNode[], b: SimpleNode[]): void;
export declare function isServerMarker(node: SimpleNode): boolean;
export declare function normalizeSnapshot(oldSnapshot: NodesSnapshot, newSnapshot: NodesSnapshot, except: Array<SimpleNode>): {
    oldSnapshot: (string | import("@simple-dom/interface").SimpleRawHTMLSection | SimpleElement | import("@simple-dom/interface").SimpleText | import("@simple-dom/interface").SimpleComment | import("@simple-dom/interface").SimpleDocument | import("@simple-dom/interface").SimpleDocumentType | import("@simple-dom/interface").SimpleDocumentFragment | null)[];
    newSnapshot: (string | import("@simple-dom/interface").SimpleRawHTMLSection | SimpleElement | import("@simple-dom/interface").SimpleText | import("@simple-dom/interface").SimpleComment | import("@simple-dom/interface").SimpleDocument | import("@simple-dom/interface").SimpleDocumentType | import("@simple-dom/interface").SimpleDocumentFragment | null)[];
};
//# sourceMappingURL=snapshot.d.ts.map