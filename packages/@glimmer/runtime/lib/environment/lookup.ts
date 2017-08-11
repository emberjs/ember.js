import { CompileTimeLookup, ComponentCapabilities, ICompilableTemplate } from "@glimmer/opcode-compiler";
import { Resolver, ProgramSymbolTable, Option } from "@glimmer/interfaces";
import { WithStaticLayout, ComponentSpec } from '../component/interfaces';
import { assert } from "@glimmer/util";

export class Lookup<Specifier> implements CompileTimeLookup<Specifier> {
  constructor(private resolver: Resolver<Specifier>) {
  }

  private getComponentSpec(handle: number): ComponentSpec {
    let spec = this.resolver.resolve<Option<ComponentSpec>>(handle);

    assert(!!spec, `Couldn't find a template named ${name}`);

    return spec!;
  }

  getCapabilities(handle: number): ComponentCapabilities {
    let spec = this.resolver.resolve<Option<ComponentSpec>>(handle);
    let { manager, definition } = spec!;
    return manager.getCapabilities(definition);
  }

  getLayout(handle: number): Option<ICompilableTemplate<ProgramSymbolTable>> {
    let { manager, definition } = this.getComponentSpec(handle);
    let capabilities = manager.getCapabilities(definition);

    if (capabilities.dynamicLayout === true) {
      return null;
    }

    let layoutSpecifier = (manager as WithStaticLayout<any, any, Specifier, Resolver<Specifier>>).getLayout(definition, this.resolver);
    return this.resolver.resolve<ICompilableTemplate<ProgramSymbolTable>>(layoutSpecifier);
  }

  lookupHelper(name: string, referer: Specifier): Option<number> {
    return this.resolver.lookupHelper(name, referer);
  }

  lookupModifier(name: string, referer: Specifier): Option<number> {
    return this.resolver.lookupModifier(name, referer);
  }

  lookupComponentSpec(name: string, referer: Specifier): Option<number> {
    return this.resolver.lookupComponent(name, referer);
  }

  lookupPartial(name: string, referer: Specifier): Option<number> {
    return this.resolver.lookupPartial(name, referer);
  }

}
