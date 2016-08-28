import { buildHelperStream } from '../system/invoke-helper';
import subscribe from '../utils/subscribe';

export default function invokeHelper(morph, env, scope, visitor, params, hash, helper, templates, context) {
  let helperStream = buildHelperStream(helper, params, hash, templates, env, scope);

  // Ember.Helper helpers are pure values, thus linkable.
  if (helperStream.linkable) {
    if (morph) {
      // When processing an inline expression, the params and hash have already
      // been linked. Thus, HTMLBars will not link the returned helperStream.
      // We subscribe the morph to the helperStream here, and also subscribe
      // the helperStream to any params.
      let addedDependency = false;
      for (let i = 0; i < params.length; i++) {
        addedDependency = true;
        helperStream.addDependency(params[i]);
      }
      for (let key in hash) {
        addedDependency = true;
        helperStream.addDependency(hash[key]);
      }
      if (addedDependency) {
        subscribe(morph, env, scope, helperStream);
      }
    }

    return { link: true, value: helperStream };
  }

  // Built-in helpers are not linkable. They must run on every rerender.
  return { value: helperStream.value() };
}
