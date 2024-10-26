import type {
  CompileTimeConstants,
  ComponentDefinition,
  ComponentDefinitionState,
  ConstantPool,
  HelperDefinitionState,
  ModifierDefinitionState,
  ResolutionTimeConstants,
  ResolvedComponentDefinition,
  RuntimeConstants,
  Template,
} from '@glimmer/interfaces';
import {
  capabilityFlagsFrom,
  getComponentTemplate,
  getInternalComponentManager,
  getInternalHelperManager,
  getInternalModifierManager,
  managerHasCapability,
} from '@glimmer/manager';
import { templateFactory } from '@glimmer/opcode-compiler';
import { assert, constants, enumerate, expect, unwrapTemplate } from '@glimmer/util';
import { InternalComponentCapabilities } from '@glimmer/vm';

import { DEFAULT_TEMPLATE } from './util/default-template';

const WELL_KNOWN_EMPTY_ARRAY: unknown = Object.freeze([]);
const STARTER_CONSTANTS = constants(WELL_KNOWN_EMPTY_ARRAY);
const WELL_KNOWN_EMPTY_ARRAY_POSITION: number = STARTER_CONSTANTS.indexOf(WELL_KNOWN_EMPTY_ARRAY);

export class CompileTimeConstantImpl implements CompileTimeConstants {
  // `0` means NULL

  protected values: unknown[] = STARTER_CONSTANTS.slice();
  protected indexMap: Map<unknown, number> = new Map(
    this.values.map((value, index) => [value, index])
  );

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

    let handles: number[] = new Array(values.length);

    for (let i = 0; i < values.length; i++) {
      handles[i] = this.value(values[i]);
    }

    return this.value(handles);
  }

  toPool(): ConstantPool {
    return this.values;
  }
}

export class RuntimeConstantsImpl implements RuntimeConstants {
  protected values: unknown[];

  constructor(pool: ConstantPool) {
    this.values = pool;
  }

  getValue<T>(handle: number) {
    return this.values[handle] as T;
  }

  getArray<T>(value: number): T[] {
    let handles = this.getValue<number[]>(value);
    let reified: T[] = new Array(handles.length);

    for (const [i, n] of enumerate(handles)) {
      reified[i] = this.getValue(n);
    }

    return reified;
  }
}

export class ConstantsImpl
  extends CompileTimeConstantImpl
  implements RuntimeConstants, ResolutionTimeConstants
{
  protected reifiedArrs: { [key: number]: unknown[] } = {
    [WELL_KNOWN_EMPTY_ARRAY_POSITION]: WELL_KNOWN_EMPTY_ARRAY as unknown[],
  };

  defaultTemplate: Template = templateFactory(DEFAULT_TEMPLATE)();

  // Used for tests and debugging purposes, and to be able to analyze large apps
  // This is why it's enabled even in production
  helperDefinitionCount = 0;
  modifierDefinitionCount = 0;
  componentDefinitionCount = 0;

  private helperDefinitionCache = new WeakMap<HelperDefinitionState, number | null>();

  private modifierDefinitionCache = new WeakMap<ModifierDefinitionState, number | null>();

  private componentDefinitionCache = new WeakMap<
    ComponentDefinitionState | ResolvedComponentDefinition,
    ComponentDefinition | null
  >();

  helper(
    definitionState: HelperDefinitionState,

    // TODO: Add a way to expose resolved name for debugging
    _resolvedName: string | null,
    isOptional: true
  ): number | null;
  helper(
    definitionState: HelperDefinitionState,

    // TODO: Add a way to expose resolved name for debugging
    _resolvedName?: string | null
  ): number;
  helper(
    definitionState: HelperDefinitionState,

    // TODO: Add a way to expose resolved name for debugging
    _resolvedName: string | null = null,
    isOptional?: true
  ): number | null {
    let handle = this.helperDefinitionCache.get(definitionState);

    if (handle === undefined) {
      let managerOrHelper = getInternalHelperManager(definitionState, isOptional);

      if (managerOrHelper === null) {
        this.helperDefinitionCache.set(definitionState, null);
        return null;
      }

      assert(managerOrHelper, 'BUG: expected manager or helper');

      let helper =
        typeof managerOrHelper === 'function'
          ? managerOrHelper
          : managerOrHelper.getHelper(definitionState);

      handle = this.value(helper);

      this.helperDefinitionCache.set(definitionState, handle);
      this.helperDefinitionCount++;
    }

    return handle;
  }

  modifier(
    definitionState: ModifierDefinitionState,
    resolvedName: string | null,
    isOptional: true
  ): number | null;
  modifier(definitionState: ModifierDefinitionState, resolvedName?: string | null): number;
  modifier(
    definitionState: ModifierDefinitionState,
    resolvedName: string | null = null,
    isOptional?: true
  ): number | null {
    let handle = this.modifierDefinitionCache.get(definitionState);

    if (handle === undefined) {
      let manager = getInternalModifierManager(definitionState, isOptional);

      if (manager === null) {
        this.modifierDefinitionCache.set(definitionState, null);
        return null;
      }

      let definition = {
        resolvedName,
        manager,
        state: definitionState,
      };

      handle = this.value(definition);

      this.modifierDefinitionCache.set(definitionState, handle);
      this.modifierDefinitionCount++;
    }

    return handle;
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

  resolvedComponent(
    resolvedDefinition: ResolvedComponentDefinition,
    resolvedName: string
  ): ComponentDefinition {
    let definition = this.componentDefinitionCache.get(resolvedDefinition);

    if (definition === undefined) {
      let { manager, state, template } = resolvedDefinition;
      let capabilities = capabilityFlagsFrom(manager.getCapabilities(resolvedDefinition));

      let compilable = null;

      if (
        !managerHasCapability(manager, capabilities, InternalComponentCapabilities.dynamicLayout)
      ) {
        template = template ?? this.defaultTemplate;
      }

      if (template !== null) {
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
        resolvedName,
        handle: -1, // replaced momentarily
        manager,
        capabilities,
        state,
        compilable,
      };

      definition.handle = this.value(definition);
      this.componentDefinitionCache.set(resolvedDefinition, definition);
      this.componentDefinitionCount++;
    }

    return expect(definition, 'BUG: resolved component definitions cannot be null');
  }

  getValue<T>(index: number) {
    assert(index >= 0, `cannot get value for handle: ${index}`);

    return this.values[index] as T;
  }

  getArray<T>(index: number): T[] {
    let reifiedArrs = this.reifiedArrs;
    let reified = reifiedArrs[index] as T[];

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
