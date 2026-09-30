import { on as glimmerOn } from '@glimmer/runtime/lib/modifiers/on';

import type { Opaque } from '@ember/-internals/utility-types';

// In normal TypeScript, this modifier is an opaque token that only needs to be importable.
// Tools like Glint *do* have a richer notion of what it is.
// Declaring it with a unique interface gives them a place
// to install more detailed type information.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface OnModifier extends Opaque<'modifier:on'> {}

// SAFETY: the cast here is from `{}` to `OnModifier`.
// This makes it strictly safer to use outside this module,
// because it is not usable as "any non-null item", which is what `{}` means.
// No information from the type itself is lost.
export const on = glimmerOn as OnModifier;
