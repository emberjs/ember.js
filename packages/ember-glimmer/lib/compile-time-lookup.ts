import {
  CompilableTemplate,
  CompileTimeLookup as ICompileTimeLookup,
  ComponentCapabilities,
  Option,
  ProgramSymbolTable,
} from '@glimmer/interfaces';
import { ComponentDefinition, ComponentManager, WithStaticLayout } from '@glimmer/runtime';
import { OwnedTemplateMeta } from 'ember-views';
import RuntimeResolver from './resolver';

interface StaticComponentManager<DefinitionState>
  extends WithStaticLayout<any, DefinitionState, OwnedTemplateMeta, RuntimeResolver>,
    ComponentManager<any, DefinitionState> {}

export default class CompileTimeLookup implements ICompileTimeLookup<OwnedTemplateMeta> {
  constructor(private resolver: RuntimeResolver) {}

  getCapabilities(handle: number): ComponentCapabilities {
    let definition = this.resolver.resolve<Option<ComponentDefinition>>(handle);
    let { manager, state } = definition!;
    return manager.getCapabilities(state);
  }

  getLayout<DefinitionState>(handle: number): Option<CompilableTemplate<ProgramSymbolTable>> {
    const { manager, state } = this.resolver.resolve<
      ComponentDefinition<DefinitionState, StaticComponentManager<DefinitionState>>
    >(handle);
    const capabilities = manager.getCapabilities(state);

    if (capabilities.dynamicLayout) {
      return null;
    }

    const invocation = manager.getLayout(state, this.resolver);
    return {
      // TODO: this seems weird, it already is compiled
      compile() {
        return invocation.handle;
      },
      symbolTable: invocation.symbolTable,
    };
  }

  lookupHelper(name: string, referrer: OwnedTemplateMeta): Option<number> {
    return this.resolver.lookupHelper(name, referrer);
  }

  lookupModifier(name: string, referrer: OwnedTemplateMeta): Option<number> {
    return this.resolver.lookupModifier(name, referrer);
  }

  lookupComponentDefinition(name: string, referrer: OwnedTemplateMeta): Option<number> {
    return this.resolver.lookupComponentHandle(name, referrer);
  }

  lookupPartial(name: string, referrer: OwnedTemplateMeta): Option<number> {
    return this.resolver.lookupPartial(name, referrer);
  }
}
