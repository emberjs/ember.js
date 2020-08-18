import { symbolFor, getGlobal } from './lib/utils';

const globalObj = getGlobal();

const GLIMMER_VALIDATOR_REGISTRATION = symbolFor('GLIMMER_VALIDATOR_REGISTRATION');

if (globalObj[GLIMMER_VALIDATOR_REGISTRATION] === true) {
  throw new Error(
    'The `@glimmer/validator` library has been included twice in this application. It could be different versions of the package, or the same version included twice by mistake. `@glimmer/validator` depends on having a single copy of the package in use at any time in an application, even if they are the same version. You must dedupe your build to remove the duplicate packages in order to prevent this error.'
  );
}

globalObj[GLIMMER_VALIDATOR_REGISTRATION] = true;

export {
  ALLOW_CYCLES,
  bump,
  CombinatorTag,
  combine,
  COMPUTE,
  CONSTANT_TAG,
  CONSTANT,
  ConstantTag,
  createTag,
  createUpdatableTag,
  CurrentTag,
  CURRENT_TAG,
  dirtyTag,
  DirtyableTag,
  EntityTag,
  INITIAL,
  isConstTag,
  Revision,
  Tag,
  UpdatableTag,
  updateTag,
  validateTag,
  valueForTag,
  VolatileTag,
  VOLATILE_TAG,
  VOLATILE,
} from './lib/validators';

export { dirtyTagFor, tagFor, tagMetaFor, setPropertyDidChange, TagMeta } from './lib/meta';

export {
  beginTrackFrame,
  endTrackFrame,
  beginUntrackFrame,
  endUntrackFrame,
  resetTracking,
  consumeTag,
  isTracking,
  track,
  untrack,
  Cache,
  createCache,
  isConst,
  getValue,
} from './lib/tracking';

export { trackedData } from './lib/tracked-data';

export {
  logTrackingStack,
  setTrackingTransactionEnv,
  runInTrackingTransaction,
  deprecateMutationsInTrackingTransaction,
} from './lib/debug';
