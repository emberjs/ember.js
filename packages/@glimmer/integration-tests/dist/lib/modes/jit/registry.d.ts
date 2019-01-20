import { AnnotatedModuleLocator, CompileTimeComponent, ComponentDefinition, Helper as GlimmerHelper, Invocation, ModifierDefinition, Option, PartialDefinition, Template, TemplateMeta } from '@glimmer/interfaces';
export interface Lookup {
    helper: GlimmerHelper;
    modifier: ModifierDefinition;
    partial: PartialDefinition;
    component: ComponentDefinition;
    template: Invocation;
    compilable: Template;
    'template-source': string;
}
export declare type LookupType = keyof Lookup;
export declare type LookupValue = Lookup[LookupType];
export declare class TypedRegistry<T> {
    private byName;
    private byHandle;
    hasName(name: string): boolean;
    getHandle(name: string): Option<number>;
    hasHandle(name: number): boolean;
    getByHandle(handle: number): Option<T>;
    register(handle: number, name: string, value: T): void;
}
export default class Registry {
    helper: TypedRegistry<GlimmerHelper>;
    modifier: TypedRegistry<ModifierDefinition>;
    partial: TypedRegistry<PartialDefinition>;
    component: TypedRegistry<ComponentDefinition>;
    template: TypedRegistry<Invocation>;
    compilable: TypedRegistry<import("@glimmer/interfaces").CompilableTemplate<import("@glimmer/interfaces").ProgramSymbolTable>>;
    'template-source': TypedRegistry<string>;
}
export declare class TestJitRegistry {
    private handleLookup;
    private registry;
    register<K extends LookupType>(type: K, name: string, value: Lookup[K]): number;
    customCompilableTemplate(sourceHandle: number, templateName: string, create: (source: string) => Template): Template;
    templateFromSource(source: string, templateName: string, create: (source: string) => Template): Template;
    compileTemplate(sourceHandle: number, templateName: string, create: (source: string) => Invocation): Invocation;
    lookup(type: LookupType, name: string, _referrer?: Option<TemplateMeta<AnnotatedModuleLocator>>): Option<number>;
    lookupComponentHandle(name: string, referrer?: Option<TemplateMeta<AnnotatedModuleLocator>>): Option<number>;
    private getCapabilities;
    lookupCompileTimeComponent(name: string, referrer: Option<TemplateMeta<AnnotatedModuleLocator>>): Option<CompileTimeComponent>;
    resolve<T>(handle: number): T;
}
//# sourceMappingURL=registry.d.ts.map