import { ComponentCapabilities, ICompilableTemplate } from '@glimmer/opcode-compiler';
import { CompilerDelegate, Specifier, specifierFor } from '@glimmer/bundle-compiler';
import { Dict } from '@glimmer/util';
import { VMHandle, ProgramSymbolTable } from '@glimmer/interfaces';

import { Modules } from './modules';
import { ComponentDefinition } from '@glimmer/runtime';

export interface WithCapabilities {
  capabilities: ComponentCapabilities;
}

export type ComponentDefinitionWithCapabilities = ComponentDefinition<WithCapabilities>;

export default class EagerCompilerDelegate implements CompilerDelegate {
  constructor(
    private components: Dict<ComponentDefinitionWithCapabilities>,
    private modules: Modules,
    private compileTimeModules: Modules,
    private compile: (specifier: Specifier) => VMHandle
  ) {}

  hasComponentInScope(componentName: string, referrer: Specifier): boolean {
    let name = this.modules.resolve(componentName, referrer, 'ui/components');
    return name ? this.modules.type(name) === 'component' : false;
  }

  resolveComponentSpecifier(componentName: string, referrer: Specifier): Specifier {
    return specifierFor(this.modules.resolve(componentName, referrer, 'ui/components')!, 'default');
  }

  getComponentCapabilities(specifier: Specifier): ComponentCapabilities {
    return this.components[specifier.module].state.capabilities;
  }

  getComponentLayout(specifier: Specifier): ICompilableTemplate<ProgramSymbolTable> {
    let compile = this.compile;
    let module = this.compileTimeModules.get(specifier.module)!;
    let table = module.get(specifier.name) as ProgramSymbolTable;

    return {
      symbolTable: table,
      compile(): VMHandle {
        return compile(specifier);
      }
    };
  }

  hasHelperInScope(helperName: string, referrer: Specifier): boolean {
    let name = this.modules.resolve(helperName, referrer);
    return name ? this.modules.type(name) === 'helper' : false;
  }

  resolveHelperSpecifier(helperName: string, referrer: Specifier): Specifier {
    let path = this.modules.resolve(helperName, referrer);
    return specifierFor(path!, 'default');
  }

  hasModifierInScope(_modifierName: string, _referrer: Specifier): boolean {
    return false;
  }
  resolveModifierSpecifier(_modifierName: string, _referrer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
  hasPartialInScope(_partialName: string, _referrer: Specifier): boolean {
    return false;
  }
  resolvePartialSpecifier(_partialName: string, _referrer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
}
