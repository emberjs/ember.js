/**
@module @ember/object/proxy
@deprecated
*/
import ObjectProxy from '@ember/object/lib/object-proxy';

/**
  Framework code imports the class from `@ember/object/lib/object-proxy`, so that it
  keeps working when the build flag removes this export.
*/
const ExportedObjectProxy = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : ObjectProxy
) as typeof ObjectProxy;
type ExportedObjectProxy<Content = unknown> = ObjectProxy<Content>;

export default ExportedObjectProxy;
