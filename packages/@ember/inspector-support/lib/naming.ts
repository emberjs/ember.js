import EmberObject from '@ember/object';
import CoreObject from '@ember/object/core';
import Observable from '@ember/object/observable';
import Evented from '@ember/object/evented';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import { ControllerMixin } from '@ember/controller';
import MutableArray from '@ember/array/mutable';
import MutableEnumerable from '@ember/enumerable/mutable';
import { NativeArray } from '@ember/array';
import ObjectProxy from '@ember/object/proxy';
import ArrayProxy from '@ember/array/proxy';
import Service from '@ember/service';
import Component from '@ember/component';
import GlimmerComponent from '@glimmer/component/src/-private/component';
import Application from '@ember/application';
import Namespace from '@ember/application/namespace';

/**
 * Map of known Ember classes and mixins to their human-readable names.
 * This allows the inspector to display friendly names without maintaining
 * its own class reference map.
 */
const EMBER_CLASS_NAMES = new Map<unknown, string>([
  [EmberObject, 'EmberObject'],
  [CoreObject, 'CoreObject'],
  [Observable, 'Observable Mixin'],
  [Evented, 'Evented Mixin'],
  [PromiseProxyMixin, 'PromiseProxy Mixin'],
  [ControllerMixin, 'ControllerMixin'],
  [MutableArray, 'MutableArray Mixin'],
  [MutableEnumerable, 'MutableEnumerable Mixin'],
  [NativeArray, 'NativeArray Mixin'],
  [ObjectProxy, 'ObjectProxy'],
  [ArrayProxy, 'ArrayProxy'],
  [Service, 'Service'],
  [Component, 'Component'],
  [GlimmerComponent, 'GlimmerComponent'],
  [Application, 'Application'],
  [Namespace, 'Namespace'],
]);

export const naming = {
  /**
   * Get a human-readable name for an Ember class or mixin.
   * Returns null if the class/mixin is not a known Ember type.
   *
   * Examples:
   * - Evented mixin → "Evented Mixin"
   * - EmberObject class → "EmberObject"
   * - Component class → "Component"
   * - Unknown class → null
   *
   * @param classOrMixin - The class constructor or mixin object
   * @returns Human-readable name or null
   */
  getClassName(classOrMixin: unknown): string | null {
    if (classOrMixin === null || classOrMixin === undefined) {
      return null;
    }

    // Check direct match in our known names map
    const knownName = EMBER_CLASS_NAMES.get(classOrMixin);
    if (knownName !== undefined) {
      return knownName;
    }

    // Check if the class/mixin has an ownerConstructor (set by Ember's class system)
    const ownerConstructor = (classOrMixin as any)?.ownerConstructor;
    if (ownerConstructor) {
      const ownerName = EMBER_CLASS_NAMES.get(ownerConstructor);
      if (ownerName !== undefined) {
        return ownerName;
      }
    }

    return null;
  },
};
