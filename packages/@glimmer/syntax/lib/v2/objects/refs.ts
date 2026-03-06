import type { SourceSlice } from '../../source/slice';
import type { FreeVarResolution } from './resolution';

import { node } from './node';

/**
 * Corresponds to `this` at the head of an expression.
 */
export class ThisReference extends node('This').fields() {}

/**
 * Corresponds to `@<ident>` at the beginning of an expression.
 */
export class ArgReference extends node('Arg').fields<{ name: SourceSlice; symbol: number }>() {}

/**
 * Corresponds to `<ident>` at the beginning of an expression, when `<ident>` is a block
 * param (e.g. from `{{#each items as |item|}}`), i.e. in the current block's scope.
 */
export class LocalVarReference extends node('Local').fields<{
  name: string;
  symbol: number;
}>() {}

/**
 * Corresponds to `<ident>` at the beginning of an expression, when `<ident>` is *not* in the
 * current block's scope.
 *
 * The `resolution` field describes how to resolve the variable:
 * - `LexicalResolution`: a JavaScript scope variable from the `scope` option
 * - `StrictResolution`: a strict-mode keyword
 * - `LooseModeResolution`: a resolver-based lookup (classic .hbs)
 */
export class FreeVarReference extends node('Free').fields<{
  name: string;
  resolution: FreeVarResolution;
  symbol: number;
}>() {}

export type VariableReference = ThisReference | ArgReference | LocalVarReference | FreeVarReference;
