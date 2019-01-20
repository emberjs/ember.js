import { JitRuntimeContext, SyntaxCompilationContext, Environment, Cursor, ElementBuilder, Dict, RenderResult, TemplateMeta } from '@glimmer/interfaces';
import { SimpleDocument, SimpleElement } from '@simple-dom/interface';
import { TestJitRegistry } from './registry';
import { TestMacros } from '../../compile/macros';
import { TestJitCompilationContext } from './compilation-context';
import TestJitRuntimeResolver from './resolver';
import RenderDelegate from '../../render-delegate';
import { ComponentKind, ComponentTypes } from '../../components';
import { TestModifierConstructor } from '../../modifiers';
import { UserHelper } from '../../helpers';
import { UpdatableReference, ConstReference } from '@glimmer/reference';
export interface JitTestDelegateContext {
    runtime: JitRuntimeContext<TemplateMeta>;
    syntax: SyntaxCompilationContext;
}
export declare function JitDelegateContext(doc: SimpleDocument, resolver: TestJitRuntimeResolver, registry: TestJitRegistry): {
    runtime: JitRuntimeContext<import("@glimmer/interfaces").OpaqueTemplateMeta>;
    syntax: {
        program: TestJitCompilationContext;
        macros: TestMacros;
    };
};
export declare class JitRenderDelegate implements RenderDelegate {
    private doc;
    static readonly isEager = false;
    static style: string;
    private resolver;
    private registry;
    private context;
    private self;
    constructor(doc?: SimpleDocument);
    getContext(): JitTestDelegateContext;
    getInitialElement(): SimpleElement;
    createElement(tagName: string): SimpleElement;
    registerComponent<K extends ComponentKind, L extends ComponentKind>(type: K, _testType: L, name: string, layout: string, Class?: ComponentTypes[K]): void;
    registerModifier(name: string, ModifierClass: TestModifierConstructor): void;
    registerHelper(name: string, helper: UserHelper): void;
    getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder;
    getSelf(context: unknown): UpdatableReference | ConstReference;
    renderTemplate(template: string, context: Dict<unknown>, element: SimpleElement): RenderResult;
}
//# sourceMappingURL=delegate.d.ts.map