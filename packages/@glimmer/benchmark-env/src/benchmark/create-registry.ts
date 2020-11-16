import {
  Helper,
  ModifierDefinition,
  ComponentDefinition,
  InternalComponentManager,
  InternalModifierManager,
  Dict,
} from '@glimmer/interfaces';
import { programCompilationContext } from '@glimmer/opcode-compiler';
import { artifacts } from '@glimmer/program';
import { TemplateOnlyComponentManager } from '@glimmer/runtime';
import { getComponentTemplate } from '@glimmer/manager';
import { SimpleElement } from '@simple-dom/interface';

import { UpdateBenchmark } from '../interfaces';
import { createProgram } from './util';
import renderBenchmark from './render-benchmark';

export interface Registry {
  /**
   * Register a template only component
   * @param name
   * @param template
   */
  registerComponent(name: string): void;
  /**
   * Register a component with a manager
   * @param name
   * @param template
   * @param component
   * @param manager
   */
  registerComponent<T>(
    name: string,
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
  const components = new Map<string, ComponentDefinition>();
  const helpers = new Map<string, Helper>();
  const modifiers = new Map<string, ModifierDefinition>();

  return {
    registerComponent: (
      name: string,
      component: unknown = null,
      manager: InternalComponentManager = new TemplateOnlyComponentManager()
    ) => {
      components.set(name, {
        state: component,
        manager,
      });
    },
    registerHelper: (name, helper) => {
      helpers.set(name, helper);
    },
    registerModifier: (name, modifier, manager) => {
      modifiers.set(name, {
        state: modifier,
        manager,
      });
    },
    render: (entry, args, element, isIteractive) => {
      const sharedArtifacts = artifacts();
      const context = programCompilationContext(sharedArtifacts, {
        lookupHelper: (name) => helpers.get(name) ?? null,
        lookupModifier: (name) => modifiers.get(name) ?? null,
        lookupComponent: (name) => components.get(name) ?? null,
        lookupPartial: () => null,
      });
      const component = components.get(entry);
      if (!component) {
        throw new Error(`missing ${entry} component`);
      }

      return renderBenchmark(
        sharedArtifacts,
        context,
        {
          lookupComponent: () => null,
          lookupPartial: () => null,
        },
        component,
        createProgram(getComponentTemplate(component.state as object)!),
        args,
        element as SimpleElement,
        isIteractive
      );
    },
  };
}
