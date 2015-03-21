import Ember from "ember-metal/core";

export let deprecation = "The `template` helper has been deprecated in favor of the `partial` helper.";

export default function templateKeyword(morph, env, scope, params, hash, template, inverse, visitor) {
  Ember.deprecate(deprecation);
  env.hooks.keyword('partial', morph, env, scope, params, hash, template, inverse, visitor);
  return true;
}
