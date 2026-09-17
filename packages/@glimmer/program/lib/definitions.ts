import type {
  ComponentDefinition,
  HelperDefinitionState,
  ModifierDefinitionState,
  ProgramConstants,
  ResolvedComponentDefinition,
} from '@glimmer/interfaces';
import assert from '@glimmer/debug-util/lib/assert';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import { unwrapTemplate } from '@glimmer/debug-util/lib/template';
import {
  getInternalHelperManager,
  getInternalModifierManager,
} from '@glimmer/manager/lib/internal/api';
import { capabilityFlagsFrom, managerHasCapability } from '@glimmer/manager/lib/util/capabilities';
import { InternalComponentCapabilities } from '@glimmer/vm/lib/flags';

/**
 * Handles for helpers, modifiers, and resolved components, keyed by the
 * constants pool they belong to. Only name resolution creates these, so
 * they live apart from `ConstantsImpl` and a strict build drops them.
 */
const HELPER_HANDLES = new WeakMap<
  ProgramConstants,
  WeakMap<HelperDefinitionState, number | null>
>();
const MODIFIER_HANDLES = new WeakMap<
  ProgramConstants,
  WeakMap<ModifierDefinitionState, number | null>
>();
const RESOLVED_COMPONENTS = new WeakMap<
  ProgramConstants,
  WeakMap<ResolvedComponentDefinition, ComponentDefinition>
>();

interface DefinitionCounts {
  helperDefinitionCount: number;
  modifierDefinitionCount: number;
  componentDefinitionCount: number;
}

function count(constants: ProgramConstants, key: keyof DefinitionCounts): void {
  let counts = constants as unknown as Partial<DefinitionCounts>;

  if (typeof counts[key] === 'number') {
    counts[key]++;
  }
}

function cacheFor<K extends object, V>(
  caches: WeakMap<ProgramConstants, WeakMap<K, V>>,
  constants: ProgramConstants
): WeakMap<K, V> {
  let cache = caches.get(constants);

  if (cache === undefined) {
    cache = new WeakMap();
    caches.set(constants, cache);
  }

  return cache;
}

export function helperHandle(
  constants: ProgramConstants,
  definitionState: HelperDefinitionState,
  _resolvedName: string | null,
  isOptional: true
): number | null;
export function helperHandle(
  constants: ProgramConstants,
  definitionState: HelperDefinitionState,
  _resolvedName?: string | null
): number;
export function helperHandle(
  constants: ProgramConstants,
  definitionState: HelperDefinitionState,
  _resolvedName: string | null = null,
  isOptional?: true
): number | null {
  let cache = cacheFor(HELPER_HANDLES, constants);
  let handle = cache.get(definitionState);

  if (handle === undefined) {
    let managerOrHelper = getInternalHelperManager(definitionState, isOptional);

    if (managerOrHelper === null) {
      cache.set(definitionState, null);
      return null;
    }

    assert(managerOrHelper, 'BUG: expected manager or helper');

    let helper =
      typeof managerOrHelper === 'function'
        ? managerOrHelper
        : managerOrHelper.getHelper(definitionState);

    handle = constants.value(helper);
    cache.set(definitionState, handle);
    count(constants, 'helperDefinitionCount');
  }

  return handle;
}

export function modifierHandle(
  constants: ProgramConstants,
  definitionState: ModifierDefinitionState,
  resolvedName: string | null,
  isOptional: true
): number | null;
export function modifierHandle(
  constants: ProgramConstants,
  definitionState: ModifierDefinitionState,
  resolvedName?: string | null
): number;
export function modifierHandle(
  constants: ProgramConstants,
  definitionState: ModifierDefinitionState,
  resolvedName: string | null = null,
  isOptional?: true
): number | null {
  let cache = cacheFor(MODIFIER_HANDLES, constants);
  let handle = cache.get(definitionState);

  if (handle === undefined) {
    let manager = getInternalModifierManager(definitionState, isOptional);

    if (manager === null) {
      cache.set(definitionState, null);
      return null;
    }

    handle = constants.value({ resolvedName, manager, state: definitionState });
    cache.set(definitionState, handle);
    count(constants, 'modifierDefinitionCount');
  }

  return handle;
}

export function resolvedComponentDefinition(
  constants: ProgramConstants,
  resolvedDefinition: ResolvedComponentDefinition,
  resolvedName: string
): ComponentDefinition {
  let cache = cacheFor(RESOLVED_COMPONENTS, constants);
  let definition = cache.get(resolvedDefinition);

  if (definition === undefined) {
    let { manager, state, template } = resolvedDefinition;
    let capabilities = capabilityFlagsFrom(manager.getCapabilities(resolvedDefinition));

    let compilable = null;

    if (!managerHasCapability(manager, capabilities, InternalComponentCapabilities.dynamicLayout)) {
      template = template ?? constants.defaultTemplate;
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

    definition.handle = constants.value(definition);
    cache.set(resolvedDefinition, definition);
    count(constants, 'componentDefinitionCount');
  }

  return expect(definition, 'BUG: resolved component definitions cannot be null');
}
