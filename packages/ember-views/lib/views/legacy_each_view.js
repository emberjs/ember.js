//2.0TODO: Remove this in 2.0
//This is a fallback path for the `{{#each}}` helper that supports deprecated
//behavior such as itemController.

import legacyEachTemplate from "ember-htmlbars/templates/legacy-each";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { computed } from "ember-metal/computed";
import View from "ember-views/views/view";
import { CONTAINER_MAP } from "ember-views/views/collection_view";

export default View.extend({
  template: legacyEachTemplate,

  _arrayController: computed(function() {
    var itemController = get(this, 'attrs.itemController');
    var controller = get(this, 'controller.container').lookupFactory('controller:array').create({
      _isVirtual: true,
      parentController: get(this, 'controller'),
      itemController: itemController,
      target: get(this, 'controller'),
      _eachView: this,
      content: get(this, 'attrs.content')
    });

    return controller;
  }),

  willUpdate(attrs) {
    let itemController = get(this, 'attrs.itemController');

    if (itemController) {
      let arrayController = get(this, '_arrayController');
      set(arrayController, 'content', attrs.content);
    }
  },

  _arrangedContent: computed('attrs.content', function() {
    if (get(this, 'attrs.itemController')) {
      return get(this, '_arrayController');
    }

    return get(this, 'attrs.content');
  }),

  _itemTagName: computed(function() {
    var tagName = get(this, 'tagName');
    return CONTAINER_MAP[tagName];
  })
});

//export default CollectionView.extend({
  //tagName: '',

  //init() {
    //var itemController = get(this, 'attrs.itemController');
    //var binding;

    //if (itemController) {
      //var controller = get(this, 'controller.container').lookupFactory('controller:array').create({
        //_isVirtual: true,
        //parentController: get(this, 'controller'),
        //itemController: itemController,
        //target: get(this, 'controller'),
        //_eachView: this
      //});

      //this.disableContentObservers(function() {
        //set(this, 'content', controller);
        //binding = new Binding('content', '_eachView.attrs.dataSource').oneWay();
        //binding.connect(controller);
      //});

      //this._arrayController = controller;
    //} else {
      //this.disableContentObservers(function() {
        //binding = new Binding('content', 'attrs.dataSource').oneWay();
        //binding.connect(this);
      //});
    //}

    //return this._super.apply(this, arguments);
  //},

  //_assertArrayLike(content) {
    //Ember.assert(fmt("The value that #each loops over must be an Array. You " +
                     //"passed %@, but it should have been an ArrayController",
                     //[content.constructor]),
                     //!ControllerMixin.detect(content) ||
                       //(content && content.isGenerated) ||
                       //content instanceof ArrayController);
    //Ember.assert(fmt("The value that #each loops over must be an Array. You passed %@",
                     //[(ControllerMixin.detect(content) &&
                       //content.get('model') !== undefined) ?
                       //fmt("'%@' (wrapped in %@)", [content.get('model'), content]) : content]),
                     //EmberArray.detect(content));
  //},

  //disableContentObservers(callback) {
    //removeBeforeObserver(this, 'content', null, '_contentWillChange');
    //removeObserver(this, 'content', null, '_contentDidChange');

    //callback.call(this);

    //addBeforeObserver(this, 'content', null, '_contentWillChange');
    //addObserver(this, 'content', null, '_contentDidChange');
  //},

  //itemViewClass: View.extend({ tagName: '' }),
  //emptyViewClass: View.extend({ tagName: '' }),

  //createChildView(_view, attrs) {
    //var view = this._super(_view, attrs);

    //var content = get(view, 'content');
    //var keyword = get(this, 'keyword');

    //if (keyword) {
      //view._keywords[keyword] = content;
    //}

    //// If {{#each}} is looping over an array of controllers,
    //// point each child view at their respective controller.
    //if (content && content.isController) {
      //set(view, 'controller', content);
    //}

    //return view;
  //},

  //destroy() {
    //if (!this._super.apply(this, arguments)) { return; }

    //if (this._arrayController) {
      //this._arrayController.destroy();
    //}

    //return this;
  //}
//});
