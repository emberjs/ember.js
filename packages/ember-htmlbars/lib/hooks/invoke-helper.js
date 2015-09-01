import { buildHelperStream } from 'ember-htmlbars/system/invoke-helper';
import subscribe from 'ember-htmlbars/utils/subscribe';

export default function invokeHelper(morph, env, scope, visitor, params, hash, helper, templates, context) {
  var helperStream = buildHelperStream(helper, params, hash, templates, env, scope);

  // Ember.Helper helpers are pure values, thus linkable
  if (helperStream.linkable) {
    if (morph) {
      // When processing an inline expression the params and hash have already
      // been linked. Thus, HTMLBars will not link the returned helperStream.
      // We subscribe the morph to the helperStream here, and also subscribe
      // the helperStream to any params.
      let addedDependency = false;
      for (var i = 0, l = params.length; i < l; i++) {
        addedDependency = true;
        helperStream.addDependency(params[i]);
      }
      for (var key in hash) {
        addedDependency = true;
        helperStream.addDependency(hash[key]);
      }
      if (addedDependency) {
        subscribe(morph, env, scope, helperStream);
      }
    }

    return { link: true, value: helperStream };
  }

  // Built-in helpers are not linkable, they must run every rerender
  return { value: helperStream.value() };
}
