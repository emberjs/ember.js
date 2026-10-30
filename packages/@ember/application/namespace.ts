/**
@module @ember/application/namespace
*/
import Namespace from '@ember/application/lib/namespace';

/**
  Framework code imports the class from `@ember/application/lib/namespace`,
  so that it keeps working when the build flag removes this export.
*/
const ExportedNamespace = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : Namespace
) as typeof Namespace;
type ExportedNamespace = Namespace;

export default ExportedNamespace;
