import { EMBER_MODERNIZED_BUILT_IN_COMPONENTS } from '@ember/canary-features';
import { deprecate } from '@ember/debug';

if (EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
  deprecate(
    `Using Ember.LinkComponent or importing from 'LinkComponent' has been deprecated, install the ` +
      `\`ember-legacy-built-in-components\` addon and use \`import { LinkComponent } from ` +
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

export { LinkComponent as default } from '@ember/-internals/glimmer';
