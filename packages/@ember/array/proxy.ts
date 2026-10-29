/**
@module @ember/array/proxy
@deprecated
*/
import ArrayProxy from '@ember/array/lib/array-proxy';

/**
  Framework code imports the class from `@ember/array/lib/array-proxy`, so that it
  keeps working when the build flag removes this export.
*/
const ExportedArrayProxy = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : ArrayProxy
) as typeof ArrayProxy;
type ExportedArrayProxy<T> = ArrayProxy<T>;

export default ExportedArrayProxy;
