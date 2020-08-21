// eslint-disable-next-line node/no-extraneous-import
import { PathReference } from '@glimmer/reference';
// eslint-disable-next-line node/no-extraneous-import
import { Tag } from '@glimmer/validator';
import { Dict, Option } from '../core';
import { ScopeBlock, JitOrAotBlock } from './scope';

declare const CAPTURED_ARGS: unique symbol;

export interface VMArguments {
  length: number;
  positional: PositionalArguments;
  named: NamedArguments;

  at<T extends PathReference<unknown>>(pos: number): T;
  capture(): CapturedArguments;
}

export interface CapturedArguments {
  positional: CapturedPositionalArguments;
  named: CapturedNamedArguments;
  [CAPTURED_ARGS]: true;
}

export interface PositionalArguments {
  length: number;
  at<T extends PathReference<unknown>>(position: number): T;
  capture(): CapturedPositionalArguments;
}

export interface CapturedPositionalArguments extends Array<PathReference> {
  [CAPTURED_ARGS]: true;
}

export interface NamedArguments {
  names: string[];
  length: number;
  has(name: string): boolean;
  get<T extends PathReference<unknown>>(name: string): T;
  capture(): CapturedNamedArguments;
}

export interface BlockArguments<C extends JitOrAotBlock> {
  names: string[];
  length: number;
  has(name: string): boolean;
  get(name: string): Option<ScopeBlock<C>>;
  capture(): CapturedBlockArguments;
}

export interface CapturedBlockArguments {
  names: string[];
  length: number;
  has(name: string): boolean;
  get(name: string): Option<ScopeBlock>;
}

export interface CapturedNamedArguments {
  [key: string]: PathReference;
  [CAPTURED_ARGS]: true;
}

export interface Arguments {
  positional: unknown[];
  named: Record<string, unknown>;
}
