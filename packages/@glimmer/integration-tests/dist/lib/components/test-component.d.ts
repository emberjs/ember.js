import { ComponentCapabilities, Option, TemplateLocator, ModuleLocator, TemplateMeta, ProgramSymbolTable } from '@glimmer/interfaces';
export interface WrappedLocatorData {
    locator: ModuleLocator;
}
export declare type WrappedLocator = TemplateMeta<WrappedLocatorData>;
export interface TestComponentDefinitionState {
    capabilities: ComponentCapabilities;
    name: string;
    ComponentClass: any;
    type: string;
    layout: Option<number>;
    locator: TemplateLocator<WrappedLocator>;
    template?: string;
    hasSymbolTable?: boolean;
    symbolTable?: ProgramSymbolTable;
}
//# sourceMappingURL=test-component.d.ts.map