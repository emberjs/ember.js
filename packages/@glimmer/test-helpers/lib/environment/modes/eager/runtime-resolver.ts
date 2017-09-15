import { RuntimeResolver, ComponentDefinition, VMHandle, Recast, ProgramSymbolTable } from '@glimmer/interfaces';
import { Specifier, SpecifierMap, LookupMap } from '@glimmer/bundle-compiler';
import { Opaque, Option, expect } from '@glimmer/util';
import { Invocation } from "@glimmer/runtime";

import { Modules } from './modules';

export default class EagerRuntimeResolver implements RuntimeResolver<Specifier> {
  constructor(
    private map: SpecifierMap,
    private modules: Modules,
    public symbolTables: LookupMap<Specifier, ProgramSymbolTable>
  ) {}

  lookupHelper(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }

  lookupModifier(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }

  lookupComponent(name: string, referrer: Specifier): Option<ComponentDefinition> {
    let moduleName = this.modules.resolve(name, referrer, 'ui/components');

    if (!moduleName) return null;

    let module = this.modules.get(moduleName);
    return module.get('default') as ComponentDefinition;
  }

  lookupPartial(_name: string, _meta: Opaque): Option<number> {
    throw new Error("Method not implemented.");
  }

  resolve<U>(specifier: number): U {
    let module = this.map.byHandle.get(specifier)!;
    return this.modules.get(module.module).get('default') as U;
  }

  getInvocation(specifier: Specifier): Invocation {
    let handle = this.getVMHandle(specifier);
    let symbolTable = expect(this.symbolTables.get(specifier), `expected symbol table for specifier ${specifier}`);

    return {
      handle,
      symbolTable
    };
  }

  getVMHandle(specifier: Specifier): VMHandle {
    let handle = expect(this.map.vmHandleBySpecifier.get(specifier), `could not find handle for specifier ${specifier}`);
    return handle as Recast<number, VMHandle>;
  }
}
