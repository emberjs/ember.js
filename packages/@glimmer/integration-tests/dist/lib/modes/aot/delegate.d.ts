import { DebugConstants, ModuleLocatorMap } from '@glimmer/bundle-compiler';
import { ComponentDefinition, Cursor, Dict, Environment, ModuleLocator, ProgramSymbolTable, RenderResult, ConstantPool, ElementBuilder } from '@glimmer/interfaces';
import { PathReference, UpdatableReference } from '@glimmer/reference';
import { SimpleElement, SimpleDocument } from '@simple-dom/interface';
import RenderDelegate from '../../render-delegate';
import { TestComponentDefinitionState } from '../../components/test-component';
import { ComponentKind } from '../../components/types';
import { AotCompilerRegistry, Modules } from './registry';
import { UserHelper } from '../../helpers';
import { TestModifierConstructor } from '../../modifiers';
export declare type RenderDelegateComponentDefinition = ComponentDefinition<TestComponentDefinitionState>;
export declare class AotRenderDelegate implements RenderDelegate {
    static readonly isEager = true;
    static style: string;
    protected registry: AotCompilerRegistry;
    protected compileTimeModules: Modules;
    protected symbolTables: ModuleLocatorMap<ProgramSymbolTable, ModuleLocator>;
    constants: DebugConstants;
    private doc;
    constructor(doc?: SimpleDocument);
    private registerInternalHelper;
    getElementBuilder(env: Environment, cursor: Cursor): ElementBuilder;
    getInitialElement(): SimpleElement;
    createElement(tagName: string): SimpleElement;
    registerComponent(type: ComponentKind, testType: ComponentKind, name: string, template: string, Class?: unknown): void;
    getSelf(context: object): UpdatableReference;
    registerHelper(name: string, helper: UserHelper): void;
    registerModifier(name: string, ModifierClass: TestModifierConstructor): void;
    private addRegisteredComponents;
    private getBundleCompiler;
    getConstants(): ConstantPool;
    private getRuntimeContext;
    renderComponent(name: string, args: Dict<PathReference<unknown>>, element: SimpleElement): RenderResult;
    renderTemplate(template: string, context: Dict<unknown>, element: SimpleElement): RenderResult;
}
//# sourceMappingURL=delegate.d.ts.map