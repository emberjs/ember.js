import { PathReference } from '@glimmer/reference';
import { Tag } from '@glimmer/validator';
import { Dict, Option } from '../core';
import { ScopeBlock, JitOrAotBlock } from './scope';

export interface VMArguments {
  length: number;
  positional: PositionalArguments;
  named: NamedArguments;

  at<T extends PathReference<unknown>>(pos: number): T;
  capture(): CapturedArguments;
}

export interface CapturedArguments {
  length: number;
  positional: CapturedPositionalArguments;
  named: CapturedNamedArguments;
  value(): CapturedArgumentsValue;
}

export interface CapturedArgumentsValue {
  named: Dict;
  positional: unknown[];
}

export interface PositionalArguments {
  length: number;
  at<T extends PathReference<unknown>>(position: number): T;
  capture(): CapturedPositionalArguments;
}

export interface CapturedPositionalArguments extends PathReference<unknown[]> {
  length: number;
  references: PathReference<unknown>[];
  at<T extends unknown>(position: number): PathReference<T>;
  value(): unknown[];
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

export interface CapturedNamedArguments extends PathReference<Dict<unknown>> {
  map: Dict<PathReference<unknown>>;
  names: string[];
  length: number;
  references: PathReference<unknown>[];
  has(name: string): boolean;
  get<T extends PathReference<unknown>>(name: string): T;
  value(): Dict<unknown>;
}
