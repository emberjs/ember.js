import CoreObject from '@ember/object/lib/core-object';

/**
  Framework code imports the class from `@ember/object/lib/core-object`, so
  that it keeps working when the build flag removes this export.
*/
const ExportedCoreObject = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : CoreObject
) as typeof CoreObject;
type ExportedCoreObject = CoreObject;

export default ExportedCoreObject;
