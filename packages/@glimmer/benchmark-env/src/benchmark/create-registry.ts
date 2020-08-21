import {
  Helper,
  ModifierDefinition,
  ComponentDefinition,
  CompileTimeComponent,
  ComponentManager,
  SerializedTemplateWithLazyBlock,
  ModifierManager,
  CompilableProgram,
  Dict,
} from '@glimmer/interfaces';
import { JitContext } from '@glimmer/opcode-compiler';
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
  registerComponent(name: string, template: SerializedTemplateWithLazyBlock<unknown>): void;
  /**
   * Register a component with a manager
   * @param name
   * @param template
   * @param component
   * @param manager
   */
  registerComponent<T>(
    name: string,
    template: SerializedTemplateWithLazyBlock<unknown>,
    component: T,
    manager: ComponentManager<unknown, T>
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
  registerModifier<T>(name: string, modifier: T, manager: ModifierManager<unknown, T>): void;

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
      template: SerializedTemplateWithLazyBlock<unknown>,
      component: unknown = null,
      manager: ComponentManager = new SimpleComponentManager()
    ) => {
      components.set(
        name,
        pushValue(handle => ({
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
        pushValue(handle => ({
          handle,
          name,
          definition: helper,
        }))
      );
    },
    registerModifier: (name, modifier, manager) => {
      modifiers.set(
        name,
        pushValue(handle => ({
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
      const context = JitContext({
        lookupHelper: name => helpers.get(name)?.handle,
        lookupModifier: name => modifiers.get(name)?.handle,
        lookupComponent: name => components.get(name),
      });
      const component = components.get(entry);
      if (!component) {
        throw new Error(`missing ${entry} component`);
      }

      return renderBenchmark(
        context,
        {
          resolve: handle => values[handle].definition,
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
