import { readArray, readHash } from "ember-metal/streams/utils";
//import ControllerMixin from "ember-runtime/mixins/controller";
import Ember from "ember-metal/core"; // assert
import merge from "ember-metal/merge";

export default {
  link(state, params, hash) {
    Ember.assert("You must provide one or more parameters to the link-to helper.", params.length);
  },

  render(morph, env, scope, params, hash, template, inverse, visitor) {
    var attrs = merge({}, readHash(hash));
    attrs.params = readArray(params);

    // Used for deprecations (to tell the user what view the deprecated syntax
    // was used in).
    attrs.view = env.view;

    // TODO: Remove once `hasBlock` is working again
    attrs.hasBlock = !!template;

    attrs.escaped = !morph.parseTextAsHTML;

    env.hooks.component(morph, env, scope, '-link-to', attrs, template, visitor);
  },

  rerender(morph, env, scope, params, hash, template, inverse, visitor) {
    this.render(morph, env, scope, params, hash, template, inverse, visitor);
  }
};
