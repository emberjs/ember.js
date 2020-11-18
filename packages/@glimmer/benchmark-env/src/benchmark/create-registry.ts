import {
  Helper,
  ModifierDefinition,
  ComponentDefinition,
  CompileTimeComponent,
  InternalComponentManager,
  SerializedTemplateWithLazyBlock,
  InternalModifierManager,
  CompilableProgram,
  Dict,
  PartialDefinition,
} from '@glimmer/interfaces';
import { programCompilationContext } from '@glimmer/opcode-compiler';
import { artifacts } from '@glimmer/program';
import { SimpleComponentManager } from '@glimmer/runtime';
import { SimpleElement } from '@simple-dom/interface';

import { UpdateBenchmark } from '../interfaces';
import { createProgram } from './util';
import renderBenchmark from './render-benchmark';

interface RegisteredValueBase<TDefinition> {
  handle: number;
  name: string;
  definition: TDefinition;
}
interface RegisteredComponent
  extends CompileTimeComponent,
    RegisteredValueBase<ComponentDefinition> {
  compilable: CompilableProgram;
}
type RegisteredHelper = RegisteredValueBase<Helper>;
type RegisteredModifier = RegisteredValueBase<ModifierDefinition>;
type RegisteredValue = RegisteredComponent | RegisteredHelper | RegisteredModifier;

export interface Registry {
  /**
   * Register a template only component
   * @param name
   * @param template
   */
  registerComponent(name: string, template: SerializedTemplateWithLazyBlock): void;
  /**
   * Register a component with a manager
   * @param name
   * @param template
   * @param component
   * @param manager
   */
  registerComponent<T>(
    name: string,
    template: SerializedTemplateWithLazyBlock,
    component: T,
    manager: InternalComponentManager<unknown, T>
  ): void;
  /**
   * Register a helper
   * @param name
   * @param helper
   */
  registerHelper(name: string, helper: Helper): void;
  /**
   * Register a modifier
   * @param name
   * @param helper
   */
  registerModifier<T>(
    name: string,
    modifier: T,
    manager: InternalModifierManager<unknown, T>
  ): void;

  render(
    entry: string,
    args: Dict<unknown>,
    element: SimpleElement | HTMLElement,
    isInteractive?: boolean
  ): Promise<UpdateBenchmark>;
}

export default function createRegistry(): Registry {
  const values: RegisteredValue[] = [];
  const components = new Map<string, RegisteredComponent>();
  const helpers = new Map<string, RegisteredHelper>();
  const modifiers = new Map<string, RegisteredModifier>();

  const pushValue = <T extends RegisteredValue>(create: (handle: number) => T) => {
    const handle = values.length;
    return (values[handle] = create(handle));
  };

  return {
    registerComponent: (
      name: string,
      template: SerializedTemplateWithLazyBlock,
      component: unknown = null,
      manager: InternalComponentManager = new SimpleComponentManager()
    ) => {
      components.set(
        name,
        pushValue((handle) => ({
          handle,
          name,
          definition: {
            state: component,
            manager,
          },
          capabilities: manager.getCapabilities(component),
          compilable: createProgram(template),
        }))
      );
    },
    registerHelper: (name, helper) => {
      helpers.set(
        name,
        pushValue((handle) => ({
          handle,
          name,
          definition: helper,
        }))
      );
    },
    registerModifier: (name, modifier, manager) => {
      modifiers.set(
        name,
        pushValue((handle) => ({
          handle,
          name,
          definition: {
            state: modifier,
            manager,
          },
        }))
      );
    },
    render: (entry, args, element, isIteractive) => {
      const sharedArtifacts = artifacts();
      const context = programCompilationContext(sharedArtifacts, {
        lookupHelper: (name) => helpers.get(name)?.handle ?? null,
        lookupModifier: (name) => modifiers.get(name)?.handle ?? null,
        lookupComponent: (name) => components.get(name) ?? null,
        lookupPartial: () => null,
        resolve: () => null,
      });
      const component = components.get(entry);
      if (!component) {
        throw new Error(`missing ${entry} component`);
      }

      return renderBenchmark(
        sharedArtifacts,
        context,
        {
          resolve<U extends ComponentDefinition | Helper | ModifierDefinition | PartialDefinition>(
            handle: number
          ): U {
            return values[handle].definition as U;
          },
          lookupComponent: () => null,
          lookupPartial: () => null,
        },
        component.definition,
        component.compilable,
        args,
        element as SimpleElement,
        isIteractive
      );
    },
  };
}
