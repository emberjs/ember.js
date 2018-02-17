/**
 * This file describes the interface between compilation time
 * and runtime.
 *
 * # Locators
 *
 * Compile time and runtime must share the same Locator. A Locator is an
 * object that describes the location of a template, and is roughly a
 * module name. The compiler and runtime may use the Locator to locally
 * resolve names relative to the template the name was found in, but must
 * share resolution rules between compilation time and runtime.
 *
 * For example, given this template with Locator
 * `{ module: 'components/Articles/Container' }:
 *
 * ```
 * <TabBar />
 * ```
 *
 * The compiler may resolve `<TabBar>` to `components/Articles/TabBar`. The
 * important thing is that the compiler and runtime share resolution rules.
 *
 * # CompileTimeLookup
 *
 * When compiling an application, the `CompileTimeLookup` is responsible
 * for resolving helpers, modifiers, components, and partials into "handles"
 * (numbers) that can be embedded into the program and used at runtime.
 *
 * # RuntimeResolver
 *
 * The `RuntimeResolver` has two responsibilities.
 *
 * 1. To turn handles created by the `CompileTimeLookup` into live helpers,
 *    modifiers, components, and partials.
 * 2. To resolve dynamic components and partials at runtime that come from
 *    calls to `{{component dynamic}}` or `{{partial dynamic}}`.
 *
 * The `CompileTimeLookup` and `RuntimeResolver` must maintain symmetry
 * between:
 *
 * * `resolver.resolve(lookup.lookupComponentDefinition(name, referrer))`; and
 * * `resolver.lookupComponentDefinition(name, referrer))`
 *
 * And between:
 *
 * * `resolver.resolve(lookup.lookupPartial(name, referrer))`; and
 * * `resolver.lookupPartial(name, referrer))`
 *
 * # Coupling
 *
 * In practice, the `CompileTimeLookup` and `RuntimeResolver` are two parts
 * of one system. The goal of this system is to allow the `CompileTimeLookup`
 * to do as much resolution as possible ahead of time, while still allowing
 * the `RuntimeResolver` to do dynamic resolution when necessary.
 */

import ComponentCapabilities from './component-capabilities';
import { Option } from './core';
import { SymbolTable, ProgramSymbolTable } from './tier1/symbol-table';
import { ComponentDefinition } from './components';

export interface CompilableProgram {
  symbolTable: ProgramSymbolTable;
  compile(): number;
}

export interface CompileTimeLookup<Locator> {
  getCapabilities(handle: number): ComponentCapabilities;
  getLayout(handle: number): Option<CompilableProgram>;

  // This interface produces module locators (and indicates if a name is present), but does not
  // produce any actual objects. The main use-case for producing objects is handled above,
  // with getCapabilities and getLayout, which drastically shrinks the size of the object
  // that the core interface is forced to reify.
  lookupHelper(name: string, referrer: Locator): Option<number>;
  lookupModifier(name: string, referrer: Locator): Option<number>;
  lookupComponentDefinition(name: string, referrer: Locator): Option<number>;
  lookupPartial(name: string, referrer: Locator): Option<number>;
}

export interface RuntimeResolver<Locator> {
  lookupComponentDefinition(name: string, referrer: Locator): Option<ComponentDefinition>;
  lookupPartial(name: string, referrer: Locator): Option<number>;

  resolve<U>(handle: number): U;
}
