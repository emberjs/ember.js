// must be literally the concrete tag from @glimmer/reference
import { Tag } from '@glimmer/reference';

import { Simple } from '@glimmer/interfaces';

// An opaque value can be anything.
export type Opaque = void | undefined | null | {};
export type Option<T> = T | null;

export interface Dict<T> {
  [key: string]: T;
}

export interface TaggedReference {
  tag: Tag;

  value(): Opaque;
  get(key: string): TaggedReference;
}

export interface Cursor {
  parent: Simple.Element,
  nextSibling: Option<Simple.Node>
}

export interface RenderOptions {
  append: Cursor;
  args: Dict<TaggedReference>;
}

export interface Slot {
  append: Cursor;
  positional: TaggedReference[];
}

export interface Rendered {
  slots: Dict<Slot>;
}

export function render(options: RenderOptions): Rendered;