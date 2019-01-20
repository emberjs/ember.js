import { CompilerDelegate } from '@glimmer/bundle-compiler';
import { ComponentCapabilities, ComponentDefinition, ComponentManager, Dict, ModuleLocator, Option, TemplateMeta } from '@glimmer/interfaces';
import { WrappedLocator, TestComponentDefinitionState } from '../../components/test-component';
export declare class Modules {
    private registry;
    has(name: string): boolean;
    get(name: string): Module;
    type(name: string): ModuleType;
    register(name: string, type: ModuleType, value: Dict<unknown>): void;
    resolve(name: string, referrer: TemplateMeta<WrappedLocator>, defaultRoot?: string): Option<string>;
}
export declare type ModuleType = 'component' | 'helper' | 'modifier' | 'partial' | 'other';
export declare class Module {
    private dict;
    type: ModuleType;
    constructor(dict: Dict, type: ModuleType);
    has(key: string): boolean;
    get(key: string): unknown;
}
export interface CapabilitiesState {
    capabilities: ComponentCapabilities;
}
export declare class AotCompilerRegistry {
    readonly components: Dict<ComponentDefinition<TestComponentDefinitionState>>;
    readonly modules: Modules;
    constructor(components?: Dict<ComponentDefinition<TestComponentDefinitionState>>, modules?: Modules);
    register(name: string, type: ModuleType, value: Dict<unknown>): void;
    addComponent(name: string, manager: ComponentManager, state: TestComponentDefinitionState): void;
    resolve(name: string, referrer: TemplateMeta<WrappedLocator>, { expected, root }?: {
        expected?: ModuleType;
        root?: string;
    }): Option<string>;
    get(name: string): Module;
    type(name: string): ModuleType;
    getComponentCapabilities(meta: TemplateMeta<WrappedLocator>): ComponentCapabilities;
}
export default class EagerCompilerDelegate implements CompilerDelegate<WrappedLocator> {
    private registry;
    constructor(registry: AotCompilerRegistry);
    hasComponentInScope(componentName: string, referrer: TemplateMeta<WrappedLocator>): boolean;
    resolveComponent(componentName: string, referrer: TemplateMeta<WrappedLocator>): ModuleLocator;
    getComponentCapabilities(meta: TemplateMeta<WrappedLocator>): ComponentCapabilities;
    hasHelperInScope(helperName: string, referrer: TemplateMeta<WrappedLocator>): boolean;
    resolveHelper(helperName: string, referrer: TemplateMeta<WrappedLocator>): ModuleLocator;
    hasModifierInScope(modifierName: string, referrer: TemplateMeta<WrappedLocator>): boolean;
    resolveModifier(modifierName: string, referrer: TemplateMeta<WrappedLocator>): ModuleLocator;
    hasPartialInScope(_partialName: string, _referrer: TemplateMeta<WrappedLocator>): boolean;
    resolvePartial(_partialName: string, _referrer: TemplateMeta<WrappedLocator>): ModuleLocator;
}
//# sourceMappingURL=registry.d.ts.map