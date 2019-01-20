import { Cursor, Dict, ElementBuilder, Environment, RenderResult } from '@glimmer/interfaces';
import { UpdatableReference } from '@glimmer/reference';
import { SimpleDocument, SimpleElement, SimpleNode } from '@simple-dom/interface';
import { ComponentKind } from '../../components';
import { UserHelper } from '../../helpers';
import { TestModifierConstructor } from '../../modifiers';
import RenderDelegate from '../../render-delegate';
import { JitTestDelegateContext } from '../jit/delegate';
export interface RehydrationStats {
    clearedNodes: SimpleNode[];
}
export declare class RehydrationDelegate implements RenderDelegate {
    static readonly isEager = false;
    static readonly style = "rehydration";
    clientEnv: JitTestDelegateContext;
    serverEnv: JitTestDelegateContext;
    private clientResolver;
    private serverResolver;
    private clientRegistry;
    private serverRegistry;
    clientDoc: SimpleDocument;
    serverDoc: SimpleDocument;
    rehydrationStats: RehydrationStats;
    private self;
    constructor();
    getInitialElement(): SimpleElement;
    createElement(tagName: string): SimpleElement;
    getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder;
    renderServerSide(template: string, context: Dict<unknown>, takeSnapshot: () => void, element?: SimpleElement | undefined): string;
    getSelf(context: unknown): UpdatableReference;
    serialize(element: SimpleElement): string;
    renderClientSide(template: string, context: Dict<unknown>, element: SimpleElement): RenderResult;
    renderTemplate(template: string, context: Dict<unknown>, element: SimpleElement, snapshot: () => void): RenderResult;
    registerComponent(type: ComponentKind, _testType: string, name: string, layout: string): void;
    registerHelper(name: string, helper: UserHelper): void;
    registerModifier(name: string, ModifierClass: TestModifierConstructor): void;
}
export declare function qunitFixture(): SimpleElement;
//# sourceMappingURL=delegate.d.ts.map