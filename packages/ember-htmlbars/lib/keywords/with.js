import { internal } from "htmlbars-runtime";
import { get } from "ember-metal/property_get";

export default {
  setupState(state, env, scope, params, hash) {
    var controller = hash.controller;

    if (controller) {
      if (!state.controller) {
        var context = params[0];
        var controllerFactory = env.container.lookupFactory('controller:' + controller);
        var parentController = scope.view ? get(scope.view, 'context') : null;

        var controllerInstance = controllerFactory.create({
          model: env.hooks.getValue(context),
          parentController: parentController,
          target: parentController
        });

        params[0] = controllerInstance;
        return { controller: controllerInstance };
      }

      return state;
    }

    return { controller: null };
  },

  isStable() {
    return true;
  },

  isEmpty(state) {
    return false;
  },

  render(morph, env, scope, params, hash, template, inverse, visitor) {
    if (morph.state.controller) { morph.addDestruction(morph.state.controller); }

    Ember.assert(
      "{{#with foo}} must be called with a single argument or the use the " +
      "{{#with foo as bar}} syntax",
      params.length === 1
    );

    Ember.assert(
      "The {{#with}} helper must be called with a block",
      !!template
    );

    if (template && template.arity === 0) {
      Ember.deprecate(
        "Using the context switching form of `{{with}}` is deprecated. " +
          "Please use the block param form (`{{#with bar as |foo|}}`) instead.",
        false,
        { url: 'http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope' }
      );
    }

    internal.continueBlock(morph, env, scope, 'with', params, hash, template, inverse, visitor);
  },

  rerender(morph, env, scope, params, hash, template, inverse, visitor) {
    internal.continueBlock(morph, env, scope, 'with', params, hash, template, inverse, visitor);
  }
};
