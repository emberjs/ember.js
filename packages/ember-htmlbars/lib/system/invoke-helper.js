import { assert } from 'ember-metal/debug';
import HelperInstanceStream from '../streams/helper-instance';
import HelperFactoryStream from '../streams/helper-factory';
import BuiltInHelperStream from '../streams/built-in-helper';

export function buildHelperStream(helper, params, hash, templates, env, scope, label) {
  let isAnyKindOfHelper = helper.isHelperInstance || helper.isHelperFactory;
  assert(
    'Helpers may not be used in the block form, for example {{#my-helper}}{{/my-helper}}. Please use a component, or alternatively use the helper in combination with a built-in Ember helper, for example {{#if (my-helper)}}{{/if}}.',
    !(isAnyKindOfHelper && templates && templates.template && templates.template.meta)
  );
  assert(
    'Helpers may not be used in the element form, for example <div {{my-helper}}>.',
    !(isAnyKindOfHelper && templates && templates.element)
  );
  if (helper.isHelperFactory) {
    return new HelperFactoryStream(helper, params, hash, label);
  } else if (helper.isHelperInstance) {
    return new HelperInstanceStream(helper, params, hash, label);
  } else {
    templates = templates || { template: {}, inverse: {} };
    return new BuiltInHelperStream(helper, params, hash, templates, env, scope, label);
  }
}
