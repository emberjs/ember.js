import { assert } from 'ember-metal/debug';
import EmberError from 'ember-metal/error';

export default function lookupPartial(env, templateName) {
  if (templateName == null) { return; }

  var nameParts = templateName.split('/');
  var lastPart = nameParts[nameParts.length - 1];

  nameParts[nameParts.length - 1] = '_' + lastPart;

  var underscoredName = nameParts.join('/');
  var template = templateFor(env, underscoredName, templateName);

  assert(
    'Unable to find partial with name "' + templateName + '"',
    !!template
  );

  return template;
}

function templateFor(env, underscored, name) {
  if (!name) { return; }
  assert('templateNames are not allowed to contain periods: ' + name, name.indexOf('.') === -1);

  if (!env.container) {
    throw new EmberError('Container was not found when looking up a views template. ' +
               'This is most likely due to manually instantiating an Ember.View. ' +
               'See: http://git.io/EKPpnA');
  }

  return env.container.lookup('template:' + underscored) || env.container.lookup('template:' + name);
}
