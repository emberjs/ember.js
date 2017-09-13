import { RuntimeResolver, ComponentDefinition, VMHandle, Recast, ProgramSymbolTable } from '@glimmer/interfaces';
import { Specifier, SpecifierMap, LookupMap } from '@glimmer/bundle-compiler';
import { Opaque, Option } from '@glimmer/util';

import { Modules } from './modules';

export class EagerRuntimeResolver implements RuntimeResolver<Specifier> {
  constructor(private map: SpecifierMap, private modules: Modules, public symbolTables: LookupMap<Specifier, ProgramSymbolTable>) {}

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

  getVMHandle(specifier: Specifier): number {
    return this.map.vmHandleBySpecifier.get(specifier) as Recast<VMHandle, number>;
  }
}
