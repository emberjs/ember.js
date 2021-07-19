/**
@module @ember/component
*/
import { TextSupport } from '@ember/-internals/views';
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

export default TextArea;
