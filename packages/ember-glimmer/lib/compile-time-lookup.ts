import { CompileTimeLookup as ICompileTimeLookup, Specifier } from '@glimmer/opcode-compiler';
import {
  CAPABILITIES
} from './component-managers/definition-state';
import RuntimeResolver from './resolver';
import { CurlyComponentDefinition } from 'ember-glimmer/lib/component-managers/curly';

export default class CompileTimeLookup implements ICompileTimeLookup<Specifier> {
  constructor(private resolver: RuntimeResolver) {}
  private getComponentDefinition(handle: number) {
    return this.resolver.resolve<Option<CurlyComponentDefinition>>(handle);
  }
  getCapabilities(handle: number) {
    return this.getComponentDefinition(handle).getCapabilities();
  }

  getLayout(handle: number) {
    const componentDefintion = this.resolver.resolve(handle);
    const { manager } = componentDefintion;
    return {
      compile() { return handle; },
      symbolTable: null
    };
  }

  lookupHelper(handle: number) {

  }

  lookupModifier(handle: number) {

  }

  lookupComponentSpec(handle: number) {

  }

  lookupPartial(handle: number) {

  }
}