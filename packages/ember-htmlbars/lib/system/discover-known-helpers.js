import isEnabled from "ember-metal/features";
import dictionary from 'ember-metal/dictionary';
import keys from 'ember-metal/keys';

export default function discoverKnownHelpers(container) {
  let registry = container && container._registry;
  let helpers = dictionary(null);

  if (isEnabled('ember-htmlbars-dashless-helpers')) {
    if (!registry) {
      return helpers;
    }

    let known = registry.knownForType('helper');
    let knownContainerKeys = keys(known);

    for (let index = 0, length = knownContainerKeys.length; index < length; index++) {
      let fullName = knownContainerKeys[index];
      let name = fullName.slice(7); // remove `helper:` from fullName

      helpers[name] = true;
    }
  }

  return helpers;
}
