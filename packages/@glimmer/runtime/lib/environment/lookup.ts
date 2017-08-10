import { CompileTimeLookup, ComponentCapabilities } from "@glimmer/opcode-compiler";
import { Resolver, ProgramSymbolTable, Unique, Option } from "@glimmer/interfaces";
import { TemplateMeta } from "@glimmer/wire-format";
import { WithStaticLayout, ComponentSpec } from '../component/interfaces';
import { assert } from "@glimmer/util";

export type LookupHandle = Unique<'LookupHandle'>;

export class Lookup implements CompileTimeLookup<TemplateMeta, LookupHandle> {
  constructor(private resolver: Resolver<TemplateMeta, LookupHandle>) {
  }

  private getComponentSpec(name: string, meta: TemplateMeta): ComponentSpec {
    let specifier = this.resolver.lookupComponent(name, meta);
    let spec = this.resolver.resolve<Option<ComponentSpec>>(specifier!);

    assert(!!spec, `Couldn't find a template named ${name}`);

    return spec!;
  }

  getCapabilities(handle: LookupHandle): ComponentCapabilities {
    let spec = this.resolver.resolve<Option<ComponentSpec>>(handle);
    let { manager, definition } = spec!;
    return manager.getCapabilities(definition);
  }

  getLayout(name: string, meta: TemplateMeta): Option<{ symbolTable: ProgramSymbolTable; handle: Unique<"Handle">; }> {
    let { manager, definition } = this.getComponentSpec(name, meta);
    let capabilities = manager.getCapabilities(definition);

    if (capabilities.dynamicLayout === true) {
      return null;
    }

    let layoutSpecifier = (manager as WithStaticLayout<any, any, any, any>).getLayout(definition, this.resolver);
    return this.resolver.resolve<{ symbolTable: ProgramSymbolTable, handle: Unique<'Handle'> }>(layoutSpecifier);
  }

  lookupHelper(name: string, meta: TemplateMeta): Option<LookupHandle> {
    return this.resolver.lookupHelper(name, meta);
  }

  lookupModifier(name: string, meta: TemplateMeta): Option<LookupHandle> {
    return this.resolver.lookupModifier(name, meta);
  }

  lookupComponent(name: string, meta: TemplateMeta): Option<LookupHandle> {
    return this.resolver.lookupComponent(name, meta);
  }

  lookupPartial(name: string, meta: TemplateMeta): Option<LookupHandle> {
    return this.resolver.lookupPartial(name, meta);
  }

}
