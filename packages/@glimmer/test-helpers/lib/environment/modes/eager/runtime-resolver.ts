import { RuntimeResolver, ComponentDefinition, VMHandle, Recast, ProgramSymbolTable } from '@glimmer/interfaces';
import { Opaque, Option, expect } from '@glimmer/util';
import { Invocation } from "@glimmer/runtime";
import { ExternalModuleTable, ModuleLocatorMap, ModuleLocator } from '@glimmer/bundle-compiler';

import { TemplateMeta } from '../../component-definition';
import { Modules } from './modules';

export default class EagerRuntimeResolver implements RuntimeResolver<TemplateMeta> {
  constructor(
    private table: ExternalModuleTable,
    private modules: Modules,
    public symbolTables: ModuleLocatorMap<ProgramSymbolTable>
  ) {}

  lookupHelper(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }

  lookupModifier(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }

  lookupComponent(name: string, referrer: TemplateMeta): Option<ComponentDefinition> {
    let moduleName = this.modules.resolve(name, referrer, 'ui/components');

    if (!moduleName) return null;

    let module = this.modules.get(moduleName);
    return module.get('default') as ComponentDefinition;
  }

  lookupPartial(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }

  resolve<U>(handle: number): U {
    let module = this.table.byHandle.get(handle)!;
    return this.modules.get(module.module).get('default') as U;
  }

  getInvocation({ locator }: TemplateMeta): Invocation {
    let handle = this.getVMHandle(locator);
    let symbolTable = expect(this.symbolTables.get(locator), `expected symbol table for module ${locator}`);

    return {
      handle,
      symbolTable
    };
  }

  getVMHandle(locator: ModuleLocator): VMHandle {
    let handle = expect(this.table.vmHandleByModuleLocator.get(locator), `could not find handle for module ${locator}`);
    return handle as Recast<number, VMHandle>;
  }
}
