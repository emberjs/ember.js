import type { Nullable } from '../core.js';
import type { Reference } from '../references.js';
import type { ScopeBlock } from './scope.js';

declare const CAPTURED_ARGS: unique symbol;

export interface VMArguments {
  length: number;
  positional: PositionalArguments;
  named: NamedArguments;

  at(pos: number): Reference;
  capture(): CapturedArguments;
}

export interface CapturedArguments {
  positional: CapturedPositionalArguments;
  named: CapturedNamedArguments;
  [CAPTURED_ARGS]: true;
}

export interface PositionalArguments {
  length: number;
  at(position: number): Reference;
  capture(): CapturedPositionalArguments;
}

export interface CapturedPositionalArguments extends Array<Reference> {
  [CAPTURED_ARGS]: true;
}

export interface NamedArguments {
  names: readonly string[];
  length: number;
  has(name: string): boolean;
  get(name: string): Reference;
  capture(): CapturedNamedArguments;
}

export interface BlockArguments {
  names: readonly string[];
  length: number;
  has(name: string): boolean;
  get(name: string): Nullable<ScopeBlock>;
  capture(): CapturedBlockArguments;
}

export interface CapturedBlockArguments {
  names: readonly string[];
  length: number;
  has(name: string): boolean;
  get(name: string): Nullable<ScopeBlock>;
}

export interface CapturedNamedArguments extends Record<string, Reference> {
  [CAPTURED_ARGS]: true;
}

export interface Arguments {
  positional: readonly unknown[];
  named: Record<string, unknown>;
}

export interface ArgumentsDebug {
  positional: readonly unknown[];
  named: Record<string, unknown>;
}

export interface ArgumentError {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
}

export function isArgumentError(arg: unknown): arg is ArgumentError;
