import { ComponentCapabilities, Option, ProgramSymbolTable } from '@glimmer/interfaces';
import { CompileTimeLookup as ICompileTimeLookup } from '@glimmer/opcode-compiler';
import { CompilableTemplate, ComponentDefinition } from '@glimmer/runtime';
import { TemplateMeta } from 'ember-views';
import RuntimeResolver from './resolver';

export default class CompileTimeLookup implements ICompileTimeLookup<TemplateMeta> {
  constructor(private resolver: RuntimeResolver) {}

  getCapabilities(handle: number): ComponentCapabilities {
    let definition = this.resolver.resolve<Option<ComponentDefinition>>(handle);
    let { manager, state } = definition!;
    return manager.getCapabilities(state);
  }

  getLayout(_handle: number): Option<CompilableTemplate<ProgramSymbolTable>> {
    // const componentDefintion: CurlyComponentDefinition = this.resolver.resolve(handle);
    return null;
  }

  lookupHelper(name: string, referrer: TemplateMeta): Option<number> {
    return this.resolver.lookupHelper(name, referrer);
  }

  lookupModifier(name: string, referrer: TemplateMeta): Option<number> {
    return this.resolver.lookupModifier(name, referrer);
  }

  lookupComponentDefinition(name: string, referrer: TemplateMeta): Option<number> {
    return this.resolver.lookupComponentDefinition(name, referrer);
  }

  lookupPartial(name: string, referrer: TemplateMeta): Option<number> {
    return this.resolver.lookupPartial(name, referrer);
  }
}
