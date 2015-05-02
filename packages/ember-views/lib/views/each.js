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
  isArray
} from "ember-metal/utils";
import {
  addObserver,
  removeObserver,
  addBeforeObserver,
  removeBeforeObserver
} from "ember-metal/observer";

import _MetamorphView from "ember-views/views/metamorph_view";
import {
  _Metamorph
} from "ember-views/views/metamorph_view";

export default CollectionView.extend(_Metamorph, {

  init() {
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

  _assertArrayLike(content) {
    var theArrayStr;
    var shouldShowError;
    var hasDetectedArray;

    Ember.assert(fmt("The value that #each loops over must be an Array. You " +
                     "passed %@, but it should have been an ArrayController",
                     [content.constructor]),
                     !ControllerMixin.detect(content) ||
                       (content && content.isGenerated) ||
                       content instanceof ArrayController);

    hasDetectedArray = EmberArray.detect(content);
    if (ControllerMixin.detect(content) && content.get('model') !== undefined) {
      theArrayStr = fmt("'%@' (wrapped in %@)", [content.get('model'), content]);
      shouldShowError = !Ember.EXTEND_PROTOTYPES &&
                        isArray(content.get("model")) &&
                        !hasDetectedArray;
    } else {
      theArrayStr = fmt("%@", [content]);
      shouldShowError = !Ember.EXTEND_PROTOTYPES &&
                        isArray(content) &&
                        !hasDetectedArray;
    }

    Ember.assert(fmt("You passed in an array $@, but Ember.EXTEND_PROTOTYPES is " +
                     "false and you forgot to wrap your array in Ember.A()",
                     [theArrayStr]),
                     !shouldShowError);

    Ember.assert(fmt("The value that #each loops over must be an Array. You passed %@",
                     [theArrayStr]),
                     hasDetectedArray);
  },

  disableContentObservers(callback) {
    removeBeforeObserver(this, 'content', null, '_contentWillChange');
    removeObserver(this, 'content', null, '_contentDidChange');

    callback.call(this);

    addBeforeObserver(this, 'content', null, '_contentWillChange');
    addObserver(this, 'content', null, '_contentDidChange');
  },

  itemViewClass: _MetamorphView,
  emptyViewClass: _MetamorphView,

  createChildView(_view, attrs) {
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

  destroy() {
    if (!this._super.apply(this, arguments)) { return; }

    if (this._arrayController) {
      this._arrayController.destroy();
    }

    return this;
  }
});
