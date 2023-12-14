import { on as glimmerOn } from '@glimmer/runtime';
import { setModifierManager as glimmerSetModifierManager } from '@glimmer/manager';
// SAFETY: at the time of writing, the cast here is from `{}` to `OnModifier`,
// which makes it strictly safer to use outside this module because it is not
// usable as "any non-null item", which is what `{}` means, without loss of any
// information from the type itself.
export const on = glimmerOn;
// NOTE: this uses assignment to *require* that the `glimmerSetModifierManager`
// is legally assignable to this type, i.e. that variance is properly upheld.
export const setModifierManager = glimmerSetModifierManager;
export { modifierCapabilities as capabilities } from '@ember/-internals/glimmer';