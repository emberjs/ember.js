import type { Nullable } from './core.js';

/**
 * Static template structure, extracted by the compiler and materialized by
 * the runtime in one step instead of one opcode per element, attribute and
 * text node.
 */
export interface StaticElement {
  readonly kind: 'element';
  readonly tag: string;
  /** `[name, value, namespace]`, in source order */
  readonly attrs: [string, string, Nullable<string>][];
  readonly children: StaticNode[];
}

export interface StaticText {
  readonly kind: 'text';
  readonly chars: string;
}

export type StaticNode = StaticElement | StaticText;

/** `path` is child-node indices from the run's root element. */
export interface AttrHole {
  readonly kind: 'attr';
  readonly path: readonly number[];
}

export interface ContentHole {
  readonly kind: 'content';
  readonly path: readonly number[];
}

export type Hole = AttrHole | ContentHole;

export interface StaticTree {
  readonly root: StaticElement;
  readonly holes: readonly Hole[];
  /** Clone source, filled in by the runtime on first materialization. */
  cached?: unknown;
}
