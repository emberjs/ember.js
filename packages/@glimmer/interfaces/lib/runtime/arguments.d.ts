// eslint-disable-next-line node/no-extraneous-import
import { Reference } from '@glimmer/reference';
// eslint-disable-next-line node/no-extraneous-import
import { Tag } from '@glimmer/validator';
import { Dict, Option } from '../core';
import { ScopeBlock, Block } from './scope';

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
  get(name: string): Option<ScopeBlock>;
  capture(): CapturedBlockArguments;
}

export interface CapturedBlockArguments {
  names: readonly string[];
  length: number;
  has(name: string): boolean;
  get(name: string): Option<ScopeBlock>;
}

export interface CapturedNamedArguments {
  [key: string]: Reference;
  [CAPTURED_ARGS]: true;
}

export interface Arguments {
  positional: readonly unknown[];
  named: Record<string, unknown>;
}
