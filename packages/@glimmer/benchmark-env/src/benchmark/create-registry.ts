import {
  Helper,
  ModifierDefinition,
  ComponentDefinition,
  CompileTimeComponent,
  ComponentManager,
  SerializedTemplateWithLazyBlock,
  ModifierManager,
} from '@glimmer/interfaces';
import { SimpleComponentManager } from '@glimmer/runtime';
import { RenderBenchmark } from '../interfaces';
import { createProgram } from './util';
import compileBenchmark from './compile-benchmark';

interface RegisteredValueBase<TDefinition> {
  handle: number;
  name: string;
  definition: TDefinition;
}
type RegisteredComponent = RegisteredValueBase<ComponentDefinition> & CompileTimeComponent;
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
  /**
   * Compile the benchmark
   * @param entry the entry template compiled with precompile
   */
  compile(entry: SerializedTemplateWithLazyBlock<unknown>): RenderBenchmark;
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
    compile: entry =>
      compileBenchmark(
        {
          lookupHelper: name => helpers.get(name)?.handle,
          lookupModifier: name => modifiers.get(name)?.handle,
          lookupComponent: name => components.get(name),
        },
        {
          resolve: handle => values[handle].definition,
        },
        entry
      ),
  };
}
