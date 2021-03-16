import { EMBER_MODERNIZED_BUILT_IN_COMPONENTS } from '@ember/canary-features';
import { deprecate } from '@ember/debug';

if (EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
  deprecate(
    `Using Ember.Checkbox or importing from 'Checkbox' has been deprecated, install the ` +
      `\`ember-legacy-built-in-components\` addon and use \`import { Checkbox } from ` +
      `'ember-legacy-built-in-components';\` instead`,
    false,
    {
      id: 'ember.legacy-built-in-components',
      until: '4.0.0',
      for: 'ember-source',
      since: {
        // TODO: update this when enabling the feature
      },
    }
  );
}

export { Checkbox as default } from '@ember/-internals/glimmer';
