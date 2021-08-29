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
 * for resolving helpers, modifiers, and components into "handles"
 * (numbers) that can be embedded into the program and used at runtime.
 *
 * # RuntimeResolver
 *
 * The `RuntimeResolver` has two responsibilities.
 *
 * 1. To turn handles created by the `CompileTimeLookup` into live helpers,
 *    modifiers, and components.
 * 2. To resolve dynamic components at runtime that come from
 *    calls to `{{component dynamic}}`.
 *
 * The `CompileTimeLookup` and `RuntimeResolver` must maintain symmetry
 * between:
 *
 * * `resolver.resolve(lookup.lookupComponentDefinition(name, referrer))`; and
 * * `resolver.lookupComponentDefinition(name, referrer))`
 *
 * # Coupling
 *
 * In practice, the `CompileTimeLookup` and `RuntimeResolver` are two parts
 * of one system. The goal of this system is to allow the `CompileTimeLookup`
 * to do as much resolution as possible ahead of time, while still allowing
 * the `RuntimeResolver` to do dynamic resolution when necessary.
 */

import { Option } from './core';
import { ProgramSymbolTable } from './tier1/symbol-table';
import { ComponentDefinitionState, ComponentInstanceState } from './components';
import { CompilableProgram, Template, HandleResult } from './template';
import { CompileTimeCompilationContext } from './program';
import { Owner, ModifierDefinitionState, HelperDefinitionState } from './runtime';
import { InternalComponentCapability, InternalComponentManager } from './managers';

export interface CompileTimeComponent {
  handle: number;
  capabilities: InternalComponentCapability;
  compilable: Option<CompilableProgram>;
}

export interface ResolvedComponentDefinition<
  D = ComponentDefinitionState,
  I = ComponentInstanceState,
  M extends InternalComponentManager<I, D> = InternalComponentManager<I, D>
> {
  state: D;
  manager: M;
  template: Template | null;
}

export const enum ResolverContext {
  Component,
  Modifier,
  Helper,
  HelperOrComponent,
}

export interface CompileTimeResolver<O extends Owner = Owner> {
  lookupHelper(name: string, owner: O): Option<HelperDefinitionState>;
  lookupModifier(name: string, owner: O): Option<ModifierDefinitionState>;
  lookupComponent(name: string, owner: O): Option<ResolvedComponentDefinition>;

  // TODO: These are used to lookup keywords that are implemented as helpers/modifiers.
  // We should try to figure out a cleaner way to do this.
  lookupBuiltInHelper(name: string): Option<HelperDefinitionState>;
  lookupBuiltInModifier(name: string): Option<ModifierDefinitionState>;
}

export interface RuntimeResolver<O extends Owner = Owner> {
  lookupComponent(name: string, owner: O): Option<ResolvedComponentDefinition>;
}
