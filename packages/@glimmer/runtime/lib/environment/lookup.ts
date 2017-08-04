import { CompileTimeLookup, ComponentCapabilities } from "@glimmer/opcode-compiler";
import { Resolver, Opaque, ProgramSymbolTable, Unique, Option } from "@glimmer/interfaces";
import { TemplateMeta } from "@glimmer/wire-format";
import { ComponentDefinition, WithStaticLayout } from '../component/interfaces';

export class Lookup implements CompileTimeLookup {
  constructor(private resolver: Resolver<Opaque, TemplateMeta>) {
  }

  getCapabilities(name: string, meta: TemplateMeta): ComponentCapabilities {
    let specifier = this.resolver.lookupComponent(name, meta);
    let definition = this.resolver.resolve<ComponentDefinition<TemplateMeta>>(specifier);

    return definition.capabilities;
  }

  getLayout(name: string, meta: TemplateMeta): Option<{ symbolTable: ProgramSymbolTable; handle: Unique<"Handle">; }> {
    let specifier = this.resolver.lookupComponent(name, meta);
    let definition = this.resolver.resolve<ComponentDefinition<TemplateMeta>>(specifier);
    let capabilities = definition.capabilities;

    if (capabilities.dynamicLayout === true) {
      return null;
    }

    let layoutSpecifier = (definition.manager as WithStaticLayout<any, any, any>).getLayout(definition, this.resolver);
    return this.resolver.resolve<{ symbolTable: ProgramSymbolTable, handle: Unique<'Handle'> }>(layoutSpecifier);
  }

  lookupHelper(name: string, meta: TemplateMeta): Opaque {
    return this.resolver.lookupHelper(name, meta);
  }

  lookupModifier(name: string, meta: TemplateMeta): Opaque {
    return this.resolver.lookupModifier(name, meta);
  }

  lookupComponent(name: string, meta: TemplateMeta): Opaque {
    return this.resolver.lookupComponent(name, meta);
  }

  lookupPartial(name: string, meta: TemplateMeta): Opaque {
    return this.resolver.lookupPartial(name, meta);
  }

}
