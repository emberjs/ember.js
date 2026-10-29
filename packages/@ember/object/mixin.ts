/**
@module @ember/object/mixin
@deprecated
*/
import Mixin from '@ember/object/lib/mixin';

export { applyMixin, mixin } from '@ember/object/mixin-internal';

/**
  Framework code imports the class from `@ember/object/lib/mixin`, so that it
  keeps working when the build flag removes this export.
*/
const ExportedMixin = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : Mixin
) as typeof Mixin;
type ExportedMixin = Mixin;

export default ExportedMixin;
