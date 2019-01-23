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
import { ResolvedLayout, STDLib, CompilableProgram, CompileTime, Template } from './template';
import { SyntaxCompilationContext } from './program';
import { Helper } from './runtime/vm';
import { ModifierDefinition } from './runtime/modifier';
import { Invocation } from './components/component-manager';

export interface HandleResolver {
  resolve(handle: number): unknown;
}

export interface CompileTimeComponent {
  handle: number;
  capabilities?: ComponentCapabilities;
  compilable: Option<CompilableProgram>;
}

export interface CompileTimeResolverDelegate<M = unknown> extends HandleResolver {
  lookupHelper(name: string, referrer: M): Option<number>;
  lookupModifier(name: string, referrer: M): Option<number>;
  lookupComponent(name: string, referrer: M): Option<CompileTimeComponent>;
  lookupPartial(name: string, referrer: M): Option<number>;

  // `name` is a cache key.
  // TODO: The caller should cache
  compile(source: string, name: string): Template;

  // For debugging
  resolve(handle: number): M;
}

export interface PartialDefinition {
  name: string; // for debugging

  getPartial(
    context: SyntaxCompilationContext
  ): { symbolTable: ProgramSymbolTable; handle: number };
}

export type ResolvedValue = ComponentDefinition | ModifierDefinition | Helper | PartialDefinition;

export interface RuntimeResolver<R = unknown> extends HandleResolver {
  lookupComponent(name: string, referrer?: Option<R>): Option<ComponentDefinition>;
  lookupPartial(name: string, referrer?: Option<R>): Option<number>;
  resolve<U extends ResolvedValue>(handle: number): U;
}

export interface JitRuntimeResolver<R = unknown> extends RuntimeResolver<R> {
  compilable(locator: R): Template;
}

export interface AotRuntimeResolver<R = unknown> extends RuntimeResolver<R> {
  // for {{component}} support
  getInvocation(locator: R): Invocation;
}

export interface RuntimeResolverDelegate<R = unknown> {
  lookupComponent?(name: string, referrer?: Option<R>): Option<ComponentDefinition> | void;
  lookupPartial?(name: string, referrer?: Option<R>): Option<number> | void;
  resolve?(handle: number): ResolvedValue | void;
  compilable?(locator: R): Template;
  getInvocation?(locator: R): Invocation;
}

export interface JitRuntimeResolverOptions<R = unknown> extends RuntimeResolverDelegate<R> {
  compilable?(locator: R): Template;
}
