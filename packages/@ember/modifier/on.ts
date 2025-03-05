import { on as glimmerOn } from '@glimmer/runtime';

import type { Opaque } from '@ember/-internals/utility-types';

// In normal TypeScript, this modifier is essentially an opaque token that just
// needs to be importable. Declaring it with a unique interface like this,
// however, gives tools like Glint (that *do* have a richer notion of what it
// is) a place to install more detailed type information.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface OnModifier extends Opaque<'modifier:on'> {}

// SAFETY: at the time of writing, the cast here is from `{}` to `OnModifier`,
// which makes it strictly safer to use outside this module because it is not
// usable as "any non-null item", which is what `{}` means, without loss of any
// information from the type itself.
export const on = glimmerOn as OnModifier;
