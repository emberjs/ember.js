import { JitRuntimeContext, SyntaxCompilationContext, Option, TemplateMeta } from '@glimmer/interfaces';
import { SimpleElement } from '@simple-dom/interface';
export declare class EmberishRootView {
    private runtime;
    private syntax;
    private template;
    element: Option<SimpleElement>;
    constructor(runtime: JitRuntimeContext<TemplateMeta>, syntax: SyntaxCompilationContext, template: string, state?: Object);
    appendTo(selector: string): void;
}
//# sourceMappingURL=emberish-root-view.d.ts.map