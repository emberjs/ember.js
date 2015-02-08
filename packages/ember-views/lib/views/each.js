import Ember from "ember-metal/core";
import { fmt } from "ember-runtime/system/string";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import CollectionView from "ember-views/views/collection_view";
import { Binding } from "ember-metal/binding";
import ControllerMixin from "ember-runtime/mixins/controller";
import ArrayController from "ember-runtime/controllers/array_controller";
import EmberArray from "ember-runtime/mixins/array";

import {
  addObserver,
  removeObserver,
  addBeforeObserver,
  removeBeforeObserver
} from "ember-metal/observer";

import {
  default as _MetamorphView,
  _Metamorph
} from "ember-views/views/metamorph_view";

export default CollectionView.extend(_Metamorph, {

  init: function() {
    var itemController = get(this, 'itemController');
    var binding;

    if (itemController) {
      var controller = get(this, 'controller.container').lookupFactory('controller:array').create({
        _isVirtual: true,
        parentController: get(this, 'controller'),
        itemController: itemController,
        target: get(this, 'controller'),
        _eachView: this
      });

      this.disableContentObservers(function() {
        set(this, 'content', controller);
        binding = new Binding('content', '_eachView.dataSource').oneWay();
        binding.connect(controller);
      });

      this._arrayController = controller;
    } else {
      this.disableContentObservers(function() {
        binding = new Binding('content', 'dataSource').oneWay();
        binding.connect(this);
      });
    }

    return this._super.apply(this, arguments);
  },

  _assertArrayLike: function(content) {
    Ember.assert(fmt("The value that #each loops over must be an Array. You " +
                     "passed %@, but it should have been an ArrayController",
                     [content.constructor]),
                     !ControllerMixin.detect(content) ||
                       (content && content.isGenerated) ||
                       content instanceof ArrayController);
    Ember.assert(fmt("The value that #each loops over must be an Array. You passed %@",
                     [(ControllerMixin.detect(content) &&
                       content.get('model') !== undefined) ?
                       fmt("'%@' (wrapped in %@)", [content.get('model'), content]) : content]),
                     EmberArray.detect(content));
  },

  disableContentObservers: function(callback) {
    removeBeforeObserver(this, 'content', null, '_contentWillChange');
    removeObserver(this, 'content', null, '_contentDidChange');

    callback.call(this);

    addBeforeObserver(this, 'content', null, '_contentWillChange');
    addObserver(this, 'content', null, '_contentDidChange');
  },

  itemViewClass: _MetamorphView,
  emptyViewClass: _MetamorphView,

  createChildView: function(_view, attrs) {
    var view = this._super(_view, attrs);

    var content = get(view, 'content');
    var keyword = get(this, 'keyword');

    if (keyword) {
      view._keywords[keyword] = content;
    }

    // If {{#each}} is looping over an array of controllers,
    // point each child view at their respective controller.
    if (content && content.isController) {
      set(view, 'controller', content);
    }

    return view;
  },

  destroy: function() {
    if (!this._super.apply(this, arguments)) { return; }

    if (this._arrayController) {
      this._arrayController.destroy();
    }

    return this;
  }
});
