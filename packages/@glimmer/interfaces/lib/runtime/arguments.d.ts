import { Tag, VersionedPathReference } from '@glimmer/reference';
import { Dict, Option } from '../core';
import { ScopeBlock, JitOrAotBlock } from './scope';

export interface VMArguments {
  tag: Tag;
  length: number;
  positional: PositionalArguments;
  named: NamedArguments;

  at<T extends VersionedPathReference<unknown>>(pos: number): T;
  capture(): CapturedArguments;
}

export interface CapturedArguments {
  tag: Tag;
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
  tag: Tag;
  length: number;
  at<T extends VersionedPathReference<unknown>>(position: number): T;
  capture(): CapturedPositionalArguments;
}

export interface CapturedPositionalArguments extends VersionedPathReference<unknown[]> {
  tag: Tag;
  length: number;
  references: VersionedPathReference<unknown>[];
  at<T extends unknown>(position: number): VersionedPathReference<T>;
  value(): unknown[];
}

export interface NamedArguments {
  tag: Tag;
  names: string[];
  length: number;
  has(name: string): boolean;
  get<T extends VersionedPathReference<unknown>>(name: string): T;
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

export interface CapturedNamedArguments extends VersionedPathReference<Dict<unknown>> {
  tag: Tag;
  map: Dict<VersionedPathReference<unknown>>;
  names: string[];
  length: number;
  references: VersionedPathReference<unknown>[];
  has(name: string): boolean;
  get<T extends VersionedPathReference<unknown>>(name: string): T;
  value(): Dict<unknown>;
}
