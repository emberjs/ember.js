/*jshint newcap:false*/
import { deprecate } from 'ember-metal/debug';
import View from 'ember-views/views/view';
import { Mixin } from 'ember-metal/mixin';

/**
 @module ember
 @submodule ember-views
*/

// The `morph` and `outerHTML` properties are internal only
// and not observable.

/**
 @class _Metamorph
 @namespace Ember
 @private
*/
export var _Metamorph = Mixin.create({
  tagName: '',
  __metamorphType: 'Ember._Metamorph',

  instrumentName: 'metamorph',

  init() {
    this._super.apply(this, arguments);
    deprecate(
      'Supplying a tagName to Metamorph views is unreliable and is deprecated. ' +
      'You may be setting the tagName on a Handlebars helper that creates a Metamorph.',
      !this.tagName,
      { id: 'ember-views.metamorph-tag-name', until: '2.4.0' }
    );

    deprecate(
      `Using ${this.__metamorphType} is deprecated.`,
      false,
      { id: 'ember-views.metamorph', until: '2.4.0' }
    );
  }
});

/**
 @class _MetamorphView
 @namespace Ember
 @extends Ember.View
 @uses Ember._Metamorph
 @private
*/
export default View.extend(_Metamorph, {
  __metamorphType: 'Ember._MetamorphView'
});
