import { SourceSlice } from '../../source/slice';
import { node } from './node';
import type { FreeVarResolution } from './resolution';

/**
 * Corresponds to `this` at the head of an expression.
 */
export class ThisReference extends node('This').fields() {}

/**
 * Corresponds to `@<ident>` at the beginning of an expression.
 */
export class ArgReference extends node('Arg').fields<{ name: SourceSlice; symbol: number }>() {}

/**
 * Corresponds to `<ident>` at the beginning of an expression, when `<ident>` is in the current
 * block's scope.
 */
export class LocalVarReference extends node('Local').fields<{ name: string; symbol: number }>() {}

/**
 * Corresponds to `<ident>` at the beginning of an expression, when `<ident>` is *not* in the
 * current block's scope.
 *
 * The `resolution: FreeVarResolution` field describes how to resolve the free variable.
 *
 * Note: In strict mode, it must always be a variable that is in a concrete JavaScript scope that
 * the template will be installed into.
 */
export class FreeVarReference extends node('Free').fields<{
  name: string;
  resolution: FreeVarResolution;
  symbol: number;
}>() {}

export type VariableReference = ThisReference | ArgReference | LocalVarReference | FreeVarReference;
