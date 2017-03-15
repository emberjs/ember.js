import {
  assert,
  Error as EmberError
} from 'ember-metal';

function parseUnderscoredName(templateName) {
  let nameParts = templateName.split('/');
  let lastIndex = nameParts.length - 1;
  let lastPart = nameParts[lastIndex];

  nameParts[lastIndex] = `_${lastPart}`;

  return nameParts.join('/');
}

export default function lookupPartial(templateName, owner) {
  if (templateName === null) { return; }

  let template = templateFor(owner, parseUnderscoredName(templateName), templateName);

  assert(
    `Unable to find partial with name "${templateName}"`,
    !!template
  );

  return template;
}

export function hasPartial(name, owner) {
  if (!owner) {
    throw new EmberError('Container was not found when looking up a views template. ' +
               'This is most likely due to manually instantiating an Ember.View. ' +
               'See: http://git.io/EKPpnA');
  }

  return owner.hasRegistration(`template:${parseUnderscoredName(name)}`) || owner.hasRegistration(`template:${name}`);
}

function templateFor(owner, underscored, name) {
  if (!name) { return; }
  assert(`templateNames are not allowed to contain periods: ${name}`, name.indexOf('.') === -1);

  if (!owner) {
    throw new EmberError('Container was not found when looking up a views template. ' +
               'This is most likely due to manually instantiating an Ember.View. ' +
               'See: http://git.io/EKPpnA');
  }

  return owner.lookup(`template:${underscored}`) || owner.lookup(`template:${name}`);
}
