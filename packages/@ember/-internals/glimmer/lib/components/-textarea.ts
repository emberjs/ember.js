/**
@module @ember/component
*/
import { CoreObject } from '@ember/-internals/runtime';
import { TextSupport } from '@ember/-internals/views';
import { EMBER_MODERNIZED_BUILT_IN_COMPONENTS } from '@ember/canary-features';
import { deprecate } from '@ember/debug';
import Component from '../component';
import layout from '../templates/empty';

/**
  The internal representation used for `Textarea` invocations.

  @class TextArea
  @extends Component
  @see {Ember.Templates.components.Textarea}
  @uses Ember.TextSupport
  @public
*/
const TextArea = Component.extend(TextSupport, {
  classNames: ['ember-text-area'],

  layout,

  tagName: 'textarea',
  attributeBindings: [
    'rows',
    'cols',
    'name',
    'selectionEnd',
    'selectionStart',
    'autocomplete',
    'wrap',
    'lang',
    'dir',
    'value',
  ],
  rows: null,
  cols: null,
});

TextArea.toString = () => '@ember/component/text-area';

if (EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
  Object.defineProperty(TextArea, '_wasReopened', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: false,
  });

  Object.defineProperty(TextArea, 'reopen', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function reopen(this: typeof TextArea, ...args: unknown[]): unknown {
      if (this === TextArea) {
        deprecate(
          'Reopening Ember.TextArea is deprecated. Consider implementing your own ' +
            'wrapper component or create a custom subclass.',
          false,
          {
            id: 'ember.built-in-components.reopen',
            for: 'ember-source',
            since: {},
            until: '4.0.0',
          }
        );

        TextArea._wasReopened = true;
      }

      return CoreObject.reopen.call(this, ...args);
    },
  });

  Object.defineProperty(TextArea, 'reopenClass', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function reopenClass(this: typeof TextArea, ...args: unknown[]): unknown {
      if (this === TextArea) {
        deprecate(
          'Reopening Ember.TextArea is deprecated. Consider implementing your own ' +
            'wrapper component or create a custom subclass.',
          false,
          {
            id: 'ember.built-in-components.reopen',
            for: 'ember-source',
            since: {},
            until: '4.0.0',
          }
        );

        TextArea._wasReopened = true;
      }

      return CoreObject.reopenClass.call(this, ...args);
    },
  });
}

export default TextArea;
