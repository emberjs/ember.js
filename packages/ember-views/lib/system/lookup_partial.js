import { assert } from 'ember-metal/debug';
import EmberError from 'ember-metal/error';

function parseUnderscoredName(templateName) {
  let nameParts = templateName.split('/');
  let lastPart = nameParts[nameParts.length - 1];

  nameParts[nameParts.length - 1] = '_' + lastPart;

  return nameParts.join('/');
}

export default function lookupPartial(env, templateName) {
  if (templateName == null) { return; }

  let template = templateFor(env, parseUnderscoredName(templateName), templateName);

  assert(
    'Unable to find partial with name "' + templateName + '"',
    !!template
  );

  return template;
}

export function hasPartial(env, name) {
  if (!env.owner) {
    throw new EmberError('Container was not found when looking up a views template. ' +
               'This is most likely due to manually instantiating an Ember.View. ' +
               'See: http://git.io/EKPpnA');
  }

  return env.owner.hasRegistration('template:' + parseUnderscoredName(name)) || env.owner.hasRegistration('template:' + name);
}

function templateFor(env, underscored, name) {
  if (!name) { return; }
  assert('templateNames are not allowed to contain periods: ' + name, name.indexOf('.') === -1);

  if (!env.owner) {
    throw new EmberError('Container was not found when looking up a views template. ' +
               'This is most likely due to manually instantiating an Ember.View. ' +
               'See: http://git.io/EKPpnA');
  }

  return env.owner.lookup('template:' + underscored) || env.owner.lookup('template:' + name);
}
