/**
@module ember
*/
import MutableEnumerable from '@ember/enumerable/lib/mutable-enumerable';

/**
  Framework code imports the mixin from `@ember/enumerable/lib/mutable-enumerable`, so that it
  keeps working when the build flag removes this export.
*/
const ExportedMutableEnumerable = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : MutableEnumerable
) as typeof MutableEnumerable;
type ExportedMutableEnumerable = MutableEnumerable;

export default ExportedMutableEnumerable;
