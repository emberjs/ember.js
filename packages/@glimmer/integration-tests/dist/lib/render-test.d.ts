/// <reference types="qunit" />
import { Dict, Option, RenderResult } from '@glimmer/interfaces';
import { SimpleElement, SimpleNode } from '@simple-dom/interface';
import { ComponentBlueprint, ComponentKind, ComponentTypes } from './components';
import { UserHelper } from './helpers';
import { TestModifierConstructor } from './modifiers';
import RenderDelegate from './render-delegate';
import { NodesSnapshot } from './snapshot';
export interface IRenderTest {
    readonly count: Count;
    testType: ComponentKind;
}
export declare class Count {
    private expected;
    private actual;
    expect(name: string, count?: number): void;
    assert(): void;
}
export declare class RenderTest implements IRenderTest {
    protected delegate: RenderDelegate;
    testType: ComponentKind;
    protected element: SimpleElement;
    protected assert: Assert;
    protected context: Dict;
    protected renderResult: Option<RenderResult>;
    protected helpers: Dict<UserHelper>;
    protected snapshot: NodesSnapshot;
    readonly count: Count;
    constructor(delegate: RenderDelegate);
    registerHelper(name: string, helper: UserHelper): void;
    registerModifier(name: string, ModifierClass: TestModifierConstructor): void;
    registerComponent<K extends ComponentKind>(type: K, name: string, layout: string, Class?: ComponentTypes[K]): void;
    buildComponent(blueprint: ComponentBlueprint): string;
    private buildArgs;
    private buildBlockParams;
    private buildElse;
    private buildAttributes;
    private buildAngleBracketComponent;
    private buildGlimmerComponent;
    private buildCurlyBlockTemplate;
    private buildCurlyComponent;
    private buildFragmentComponent;
    private buildBasicComponent;
    private buildDynamicComponent;
    shouldBeVoid(tagName: string): void;
    render(template: string | ComponentBlueprint, properties?: Dict<unknown>): void;
    rerender(properties?: Dict<unknown>): void;
    protected set(key: string, value: unknown): void;
    protected setProperties(properties: Dict<unknown>): void;
    protected takeSnapshot(): NodesSnapshot;
    protected assertStableRerender(): void;
    protected assertHTML(html: string, message?: string): void;
    protected assertComponent(content: string, attrs?: Object): void;
    private runTask;
    protected assertStableNodes({ except: _except }?: {
        except: SimpleNode | SimpleNode[];
    }): void;
}
//# sourceMappingURL=render-test.d.ts.map