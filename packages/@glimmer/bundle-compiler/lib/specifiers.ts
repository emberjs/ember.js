import { dict, Dict } from '@glimmer/util';

export type ModuleName = string;
export type NamedExport = string;

/**
 * Specifiers are a data structure that represents a single export for a given
 * module. For example, given the file `person.js`:
 *
 *    export default class Person {
 *      constructor(firstName, lastName) {
 *        this.firstName = firstName;
 *        this.lastName = lastName;
 *      }
 *    }
 *
 *    export const DEFAULT_PERSON = new Person('Yehuda', 'Katz');
 *
 * This file would be described by two specifiers:
 *
 *   // describes the Person class default export
 *   { module: 'person.js', name: 'default' }
 *   // describes the named export of the Yehuda Katz instance
 *   { module: 'person.js', name: 'DEFAULT_PERSON' }
 *
 * Specifiers allow the Glimmer compiler and the host environment to refer to
 * module exports symbolically at compile time. During compilation, each specifier
 * is assigned a unique handle. At runtime, the host environment is responsible for
 * providing the actual module export value for a given handle.
 */
export interface Specifier {
  module: ModuleName;
  name: NamedExport;
}

const SPECIFIERS = dict<Dict<Specifier>>();

/**
 * Returns a Specifier object for a given module/export name pair.
 *
 * Because the compiler relies on identity for checking specifier equality, the
 * same object is guaranteed to be returned from this function if invoked with
 * the same arguments multiple times. That is, `specifierFor('a', 'b') ===
 * specifierFor('a', 'b')`.
 *
 * @param module the module identifier, usually a relative path
 * @param name the export name (or 'default' for default exports)
 * @returns {Specifier}
 */
export function specifierFor(module: ModuleName, name: NamedExport = 'default'): Specifier {
  let specifiers = SPECIFIERS[module];

  if (!specifiers) specifiers = SPECIFIERS[module] = dict<Specifier>();

  let specifier = specifiers[name];

  if (!specifier) specifier = specifiers[name] = { module, name };

  return specifier;
}
