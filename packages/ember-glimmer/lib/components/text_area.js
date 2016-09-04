/**
@module ember
@submodule ember-views
*/
import Component from '../component';
import { TextSupport } from 'ember-views';
import layout from '../templates/empty';

/**
  The internal class used to create textarea element when the `{{textarea}}`
  helper is used.

  See [Ember.Templates.helpers.textarea](/api/classes/Ember.Templates.helpers.html#method_textarea)  for usage details.

  ## Layout and LayoutName properties

  Because HTML `textarea` elements do not contain inner HTML the `layout` and
  `layoutName` properties will not be applied. See [Ember.View](/api/classes/Ember.View.html)'s
  layout section for more information.

  @class TextArea
  @namespace Ember
  @extends Ember.Component
  @uses Ember.TextSupport
  @public
*/
export default Component.extend(TextSupport, {
  classNames: ['ember-text-area'],

  layout: layout,

  tagName: 'textarea',
  attributeBindings: [
    'rows',
    'cols',
    'name',
    'selectionEnd',
    'selectionStart',
    'wrap',
    'lang',
    'dir',
    'value'
  ],
  rows: null,
  cols: null
});
