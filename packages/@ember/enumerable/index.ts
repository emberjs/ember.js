/**
@module @ember/enumerable
@private
@deprecated
*/
import Enumerable from '@ember/enumerable/lib/enumerable';

/**
  Framework code imports the mixin from `@ember/enumerable/lib/enumerable`, so that it
  keeps working when the build flag removes this export.
*/
const ExportedEnumerable = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : Enumerable
) as typeof Enumerable;
type ExportedEnumerable = Enumerable;

export default ExportedEnumerable;
