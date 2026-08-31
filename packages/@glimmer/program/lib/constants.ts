import type {
  ComponentDefinition,
  ComponentDefinitionState,
  ConstantPool,
  Optional,
  ProgramConstants,
  ResolvedComponentDefinition,
  Template,
} from '@glimmer/interfaces';
import { constants } from '@glimmer/constants/lib/immediate';
import assert from '@glimmer/debug-util/lib/assert';
import { unwrapTemplate } from '@glimmer/debug-util/lib/template';
import { capabilityFlagsFrom, managerHasCapability } from '@glimmer/manager/lib/util/capabilities';
import { getComponentTemplate } from '@glimmer/manager/lib/public/template';
import { getInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import createAotTemplateFactory from '@glimmer/opcode-compiler/lib/aot/template';
import { enumerate } from '@glimmer/util/lib/array-utils';
import { InternalComponentCapabilities } from '@glimmer/vm/lib/flags';

import { DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_WRAPPED } from './util/default-template';

const WELL_KNOWN_EMPTY_ARRAY: unknown = Object.freeze([]);
const STARTER_CONSTANTS = constants(WELL_KNOWN_EMPTY_ARRAY);
const WELL_KNOWN_EMPTY_ARRAY_POSITION: number = STARTER_CONSTANTS.indexOf(WELL_KNOWN_EMPTY_ARRAY);

export class ConstantsImpl implements ProgramConstants {
  protected reifiedArrs: { [key: number]: unknown[] } = {
    [WELL_KNOWN_EMPTY_ARRAY_POSITION]: WELL_KNOWN_EMPTY_ARRAY as unknown[],
  };

  defaultTemplate: Template = createAotTemplateFactory(
    DEFAULT_TEMPLATE,
    DEFAULT_TEMPLATE_WRAPPED
  )();

  // Used for tests and debugging purposes, and to be able to analyze large apps
  // This is why it's enabled even in production
  componentDefinitionCount = 0;
  // Incremented by `./definitions` for the same debugging purpose.
  helperDefinitionCount = 0;
  modifierDefinitionCount = 0;

  private values: unknown[] = STARTER_CONSTANTS.slice();
  private indexMap: Map<unknown, number> = new Map(
    this.values.map((value, index) => [value, index])
  );

  private componentDefinitionCache = new WeakMap<
    ComponentDefinitionState | ResolvedComponentDefinition,
    ComponentDefinition | null
  >();

  value(value: unknown) {
    let indexMap = this.indexMap;
    let index = indexMap.get(value);

    if (index === undefined) {
      index = this.values.push(value) - 1;
      indexMap.set(value, index);
    }

    return index;
  }

  array(values: unknown[]): number {
    if (values.length === 0) {
      return WELL_KNOWN_EMPTY_ARRAY_POSITION;
    }

    let handles = new Array<number>(values.length);

    for (let i = 0; i < values.length; i++) {
      handles[i] = this.value(values[i]);
    }

    return this.value(handles);
  }

  toPool(): ConstantPool {
    return this.values;
  }

  hasHandle(handle: number): boolean {
    return this.values.length > handle;
  }

  component(definitionState: ComponentDefinitionState, owner: object): ComponentDefinition;
  component(
    definitionState: ComponentDefinitionState,
    owner: object,
    isOptional?: true,
    debugName?: string
  ): ComponentDefinition | null {
    let definition = this.componentDefinitionCache.get(definitionState);

    if (definition === undefined) {
      let manager = getInternalComponentManager(definitionState, isOptional);

      if (manager === null) {
        this.componentDefinitionCache.set(definitionState, null);
        return null;
      }

      assert(manager, 'BUG: expected manager');

      let capabilities = capabilityFlagsFrom(manager.getCapabilities(definitionState));

      let templateFactory = getComponentTemplate(definitionState);

      let compilable = null;
      let template;

      if (
        !managerHasCapability(manager, capabilities, InternalComponentCapabilities.dynamicLayout)
      ) {
        template = templateFactory?.(owner) ?? this.defaultTemplate;
      } else {
        template = templateFactory?.(owner);
      }

      if (template !== undefined) {
        template = unwrapTemplate(template);

        compilable = managerHasCapability(
          manager,
          capabilities,
          InternalComponentCapabilities.wrapped
        )
          ? template.asWrappedLayout()
          : template.asLayout();
      }

      definition = {
        resolvedName: null,
        handle: -1, // replaced momentarily
        manager,
        capabilities,
        state: definitionState,
        compilable,
      };

      definition.handle = this.value(definition);

      if (debugName) {
        definition.debugName = debugName;
      }

      this.componentDefinitionCache.set(definitionState, definition);
      this.componentDefinitionCount++;
    }

    return definition;
  }

  getValue<T>(index: number) {
    assert(index >= 0, `cannot get value for handle: ${index}`);

    return this.values[index] as T;
  }

  getArray<T>(index: number): T[] {
    let reifiedArrs = this.reifiedArrs;
    let reified = reifiedArrs[index] as Optional<T[]>;

    if (reified === undefined) {
      let names: number[] = this.getValue(index);
      reified = new Array(names.length);

      for (const [i, name] of enumerate(names)) {
        reified[i] = this.getValue(name);
      }

      reifiedArrs[index] = reified;
    }

    return reified;
  }
}
