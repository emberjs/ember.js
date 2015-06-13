import isEnabled from 'ember-metal/features';
import dictionary from 'ember-metal/dictionary';

export default function discoverKnownHelpers(container) {
  let registry = container && container.registry;
  let helpers = dictionary(null);

  if (isEnabled('ember-htmlbars-dashless-helpers')) {
    if (!registry) {
      return helpers;
    }

    let known = registry.knownForType('helper');
    let knownContainerKeys = Object.keys(known);

    for (let index = 0, length = knownContainerKeys.length; index < length; index++) {
      let fullName = knownContainerKeys[index];
      let name = fullName.slice(7); // remove `helper:` from fullName

      helpers[name] = true;
    }
  }

  return helpers;
}
