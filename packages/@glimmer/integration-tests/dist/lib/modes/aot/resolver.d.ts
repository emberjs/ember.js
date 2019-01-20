import { ExternalModuleTable, ModuleLocatorMap } from '@glimmer/bundle-compiler';
import { Modules } from './registry';
import { WrappedLocator } from '../../components/test-component';
import { ProgramSymbolTable, Option, TemplateMeta, ComponentDefinition, ModuleLocator, Invocation, Template, RuntimeResolver } from '@glimmer/interfaces';
export default class AotRuntimeResolver implements RuntimeResolver {
    private table;
    private modules;
    symbolTables: ModuleLocatorMap<ProgramSymbolTable>;
    constructor(table: ExternalModuleTable, modules: Modules, symbolTables: ModuleLocatorMap<ProgramSymbolTable>);
    lookupHelper(_name: string, _meta: unknown): Option<number>;
    lookupModifier(_name: string, _meta: unknown): Option<number>;
    lookupComponent(name: string, referrer: Option<TemplateMeta<WrappedLocator>>): Option<ComponentDefinition>;
    lookupPartial(_name: string, _meta: unknown): Option<number>;
    resolve<U>(handle: number): U;
    getInvocation(locator: TemplateMeta<ModuleLocator>): Invocation;
    compilable(_locator: TemplateMeta<ModuleLocator>): Template;
    getVMHandle(locator: ModuleLocator): number;
}
//# sourceMappingURL=resolver.d.ts.map