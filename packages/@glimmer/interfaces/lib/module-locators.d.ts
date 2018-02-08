export type ModuleName = string;
export type NamedExport = string;

/**
 * ModuleLocators are a data structure that represents a single export for a
 * given module. For example, given the file `person.js`:
 *
 *    export default class Person { constructor(firstName, lastName) {
 *      this.firstName = firstName; this.lastName = lastName;
 *      }
 *    }
 *
 *    export const DEFAULT_PERSON = new Person('Yehuda', 'Katz');
 *
 * This file would be described by two module locators:
 *
 *  // describes the Person class default export
 *  { module: 'person.js', name:  'default' }
 *  // describes the named export of the Yehuda Katz instance
 *  { module: 'person.js', name: 'DEFAULT_PERSON' }
 *
 * Module locators allow the Glimmer compiler and the host environment to refer
 * to module exports symbolically at compile time. During compilation, each
 * module export is assigned a unique handle. At runtime, the host environment
 * is responsible for providing the actual module export value for a given
 * handle.
 */
export interface ModuleLocator {
  module: ModuleName;
  name: NamedExport;
}

/**
 * An AnnotatedModuleLocator is a ModuleLocator augmented with additional
 * metadata about that module that is made available to the compiler.
 */
export interface AnnotatedModuleLocator extends ModuleLocator {
  kind: string;
  meta: {};
}

/**
 * A TemplateLocator is a ModuleLocator annotated with additional information
 * about a template.
 */
export interface TemplateLocator<Meta> extends AnnotatedModuleLocator {
  kind: 'template';
  meta: Meta;
}
