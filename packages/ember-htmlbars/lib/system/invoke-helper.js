import HelperInstanceStream from 'ember-htmlbars/streams/helper-instance';
import HelperFactoryStream from 'ember-htmlbars/streams/helper-factory';
import BuiltInHelperStream from 'ember-htmlbars/streams/built-in-helper';
import CompatHelperStream from 'ember-htmlbars/streams/compat-helper';

export function buildHelperStream(helper, params, hash, templates, env, scope, context, label) {
  Ember.assert('Helpers may not be used in the block form, for example {{#my-helper}}{{/my-helper}}. Please use a component, or alternatively use the helper in combination with a built-in Ember helper, for example {{#if (my-helper)}}{{/if}}.', !helper.isHelperInstance || !helper.isHelperFactory && !templates.template.meta);
  if (helper.isHelperFactory) {
    return new HelperFactoryStream(helper, params, hash, label);
  } else if (helper.isHelperInstance) {
    return new HelperInstanceStream(helper, params, hash, label);
  } else if (helper.helperFunction) {
    return new CompatHelperStream(helper, params, hash, templates, env, scope, label);
  } else {
    return new BuiltInHelperStream(helper, params, hash, templates, env, scope, context, label);
  }
}
