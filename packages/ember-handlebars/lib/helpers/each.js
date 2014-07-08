
/**
@module ember
@submodule ember-handlebars
*/
import Ember from "ember-metal/core"; // Ember.assert;, Ember.K
// var emberAssert = Ember.assert,
var K = Ember.K;

import EmberHandlebars from "ember-handlebars-compiler";
var helpers = EmberHandlebars.helpers;

import { fmt } from "ember-runtime/system/string";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import CollectionView from "ember-views/views/collection_view";
import { Binding } from "ember-metal/binding";
import ControllerMixin from "ember-runtime/mixins/controller";
import ArrayController from "ember-runtime/controllers/array_controller";
import EmberArray from "ember-runtime/mixins/array";
import copy from "ember-runtime/copy";
import run from "ember-metal/run_loop";
import { on } from "ember-metal/events";
import { handlebarsGet } from "ember-handlebars/ext";
import { computed } from "ember-metal/computed";

import {
  addObserver,
  removeObserver,
  addBeforeObserver,
  removeBeforeObserver
} from "ember-metal/observer";

import {
  _Metamorph,
  _MetamorphView
} from "ember-handlebars/views/metamorph_view";

var EachView = CollectionView.extend(_Metamorph, {

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

      set(this, '_arrayController', controller);
    } else {
      this.disableContentObservers(function() {
        binding = new Binding('content', 'dataSource').oneWay();
        binding.connect(this);
      });
    }

    return this._super();
  },

  _assertArrayLike: function(content) {
    Ember.assert(fmt("The value that #each loops over must be an Array. You " +
                     "passed %@, but it should have been an ArrayController",
                     [content.constructor]),
                     !ControllerMixin.detect(content) ||
                       (content && content.isGenerated) ||
                       content instanceof ArrayController);
    Ember.assert(fmt("The value that #each loops over must be an Array. You passed %@", [(ControllerMixin.detect(content) && content.get('model') !== undefined) ? fmt("'%@' (wrapped in %@)", [content.get('model'), content]) : content]), EmberArray.detect(content));
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

  createChildView: function(view, attrs) {
    view = this._super(view, attrs);

    // At the moment, if a container view subclass wants
    // to insert keywords, it is responsible for cloning
    // the keywords hash. This will be fixed momentarily.
    var keyword = get(this, 'keyword');
    var content = get(view, 'content');

    if (keyword) {
      var data = get(view, 'templateData');

      data = copy(data);
      data.keywords = view.cloneKeywords();
      set(view, 'templateData', data);

      // In this case, we do not bind, because the `content` of
      // a #each item cannot change.
      data.keywords[keyword] = content;
    }

    // If {{#each}} is looping over an array of controllers,
    // point each child view at their respective controller.
    if (content && content.isController) {
      set(view, 'controller', content);
    }

    return view;
  },

  destroy: function() {
    if (!this._super()) { return; }

    var arrayController = get(this, '_arrayController');

    if (arrayController) {
      arrayController.destroy();
    }

    return this;
  }
});

// Defeatureify doesn't seem to like nested functions that need to be removed
function _addMetamorphCheck() {
  EachView.reopen({
    _checkMetamorph: on('didInsertElement', function() {
      Ember.assert("The metamorph tags, " +
                   this.morph.start + " and " + this.morph.end +
                   ", have different parents.\nThe browser has fixed your template to output valid HTML (for example, check that you have properly closed all tags and have used a TBODY tag when creating a table with '{{#each}}')",
        document.getElementById( this.morph.start ).parentNode ===
        document.getElementById( this.morph.end ).parentNode
      );
    })
  });
}

// until ember-debug is es6ed
var runInDebug = function(f){ f(); };
runInDebug( function() {
  _addMetamorphCheck();
});

var GroupedEach = EmberHandlebars.GroupedEach = function(context, path, options) {
  var self = this,
      normalized = EmberHandlebars.normalizePath(context, path, options.data);

  this.context = context;
  this.path = path;
  this.options = options;
  this.template = options.fn;
  this.containingView = options.data.view;
  this.normalizedRoot = normalized.root;
  this.normalizedPath = normalized.path;
  this.content = this.lookupContent();

  this.addContentObservers();
  this.addArrayObservers();

  this.containingView.on('willClearRender', function() {
    self.destroy();
  });
};

GroupedEach.prototype = {
  contentWillChange: function() {
    this.removeArrayObservers();
  },

  contentDidChange: function() {
    this.content = this.lookupContent();
    this.addArrayObservers();
    this.rerenderContainingView();
  },

  contentArrayWillChange: K,

  contentArrayDidChange: function() {
    this.rerenderContainingView();
  },

  lookupContent: function() {
    return handlebarsGet(this.normalizedRoot, this.normalizedPath, this.options);
  },

  addArrayObservers: function() {
    if (!this.content) { return; }

    this.content.addArrayObserver(this, {
      willChange: 'contentArrayWillChange',
      didChange: 'contentArrayDidChange'
    });
  },

  removeArrayObservers: function() {
    if (!this.content) { return; }

    this.content.removeArrayObserver(this, {
      willChange: 'contentArrayWillChange',
      didChange: 'contentArrayDidChange'
    });
  },

  addContentObservers: function() {
    addBeforeObserver(this.normalizedRoot, this.normalizedPath, this, this.contentWillChange);
    addObserver(this.normalizedRoot, this.normalizedPath, this, this.contentDidChange);
  },

  removeContentObservers: function() {
    removeBeforeObserver(this.normalizedRoot, this.normalizedPath, this.contentWillChange);
    removeObserver(this.normalizedRoot, this.normalizedPath, this.contentDidChange);
  },

  render: function() {
    if (!this.content) { return; }

    var content = this.content,
        contentLength = get(content, 'length'),
        options = this.options,
        data = options.data,
        template = this.template;

    data.insideEach = true;
    for (var i = 0; i < contentLength; i++) {
      var context = content.objectAt(i);
      options.data.keywords[options.hash.keyword] = context;
      template(context, { data: data });
    }
  },

  rerenderContainingView: function() {
    var self = this;
    run.scheduleOnce('render', this, function() {
      // It's possible it's been destroyed after we enqueued a re-render call.
      if (!self.destroyed) {
        self.containingView.rerender();
      }
    });
  },

  destroy: function() {
    this.removeContentObservers();
    if (this.content) {
      this.removeArrayObservers();
    }
    this.destroyed = true;
  }
};

/**
  The `{{#each}}` helper loops over elements in a collection, rendering its
  block once for each item. It is an extension of the base Handlebars `{{#each}}`
  helper:

  ```javascript
  Developers = [{name: 'Yehuda'},{name: 'Tom'}, {name: 'Paul'}];
  ```

  ```handlebars
  {{#each Developers}}
    {{name}}
  {{/each}}
  ```

  `{{each}}` supports an alternative syntax with element naming:

  ```handlebars
  {{#each person in Developers}}
    {{person.name}}
  {{/each}}
  ```

  When looping over objects that do not have properties, `{{this}}` can be used
  to render the object:

  ```javascript
  DeveloperNames = ['Yehuda', 'Tom', 'Paul']
  ```

  ```handlebars
  {{#each DeveloperNames}}
    {{this}}
  {{/each}}
  ```
  ### {{else}} condition
  `{{#each}}` can have a matching `{{else}}`. The contents of this block will render
  if the collection is empty.

  ```
  {{#each person in Developers}}
    {{person.name}}
  {{else}}
    <p>Sorry, nobody is available for this task.</p>
  {{/each}}
  ```
  ### Specifying a View class for items
  If you provide an `itemViewClass` option that references a view class
  with its own `template` you can omit the block.

  The following template:

  ```handlebars
  {{#view App.MyView }}
    {{each view.items itemViewClass="App.AnItemView"}}
  {{/view}}
  ```

  And application code

  ```javascript
  App = Ember.Application.create({
    MyView: Ember.View.extend({
      items: [
        Ember.Object.create({name: 'Dave'}),
        Ember.Object.create({name: 'Mary'}),
        Ember.Object.create({name: 'Sara'})
      ]
    })
  });

  App.AnItemView = Ember.View.extend({
    template: Ember.Handlebars.compile("Greetings {{name}}")
  });
  ```

  Will result in the HTML structure below

  ```html
  <div class="ember-view">
    <div class="ember-view">Greetings Dave</div>
    <div class="ember-view">Greetings Mary</div>
    <div class="ember-view">Greetings Sara</div>
  </div>
  ```

  If an `itemViewClass` is defined on the helper, and therefore the helper is not
  being used as a block, an `emptyViewClass` can also be provided optionally.
  The `emptyViewClass` will match the behavior of the `{{else}}` condition
  described above. That is, the `emptyViewClass` will render if the collection
  is empty.

  ### Representing each item with a Controller.
  By default the controller lookup within an `{{#each}}` block will be
  the controller of the template where the `{{#each}}` was used. If each
  item needs to be presented by a custom controller you can provide a
  `itemController` option which references a controller by lookup name.
  Each item in the loop will be wrapped in an instance of this controller
  and the item itself will be set to the `model` property of that controller.

  This is useful in cases where properties of model objects need transformation
  or synthesis for display:

  ```javascript
  App.DeveloperController = Ember.ObjectController.extend({
    isAvailableForHire: function() {
      return !this.get('model.isEmployed') && this.get('model.isSeekingWork');
    }.property('isEmployed', 'isSeekingWork')
  })
  ```

  ```handlebars
  {{#each person in developers itemController="developer"}}
    {{person.name}} {{#if person.isAvailableForHire}}Hire me!{{/if}}
  {{/each}}
  ```

  Each itemController will receive a reference to the current controller as
  a `parentController` property.

  ### (Experimental) Grouped Each

  When used in conjunction with the experimental [group helper](https://github.com/emberjs/group-helper),
  you can inform Handlebars to re-render an entire group of items instead of
  re-rendering them one at a time (in the event that they are changed en masse
  or an item is added/removed).

  ```handlebars
  {{#group}}
    {{#each people}}
      {{firstName}} {{lastName}}
    {{/each}}
  {{/group}}
  ```

  This can be faster than the normal way that Handlebars re-renders items
  in some cases.

  If for some reason you have a group with more than one `#each`, you can make
  one of the collections be updated in normal (non-grouped) fashion by setting
  the option `groupedRows=true` (counter-intuitive, I know).

  For example,

  ```handlebars
  {{dealershipName}}

  {{#group}}
    {{#each dealers}}
      {{firstName}} {{lastName}}
    {{/each}}

    {{#each car in cars groupedRows=true}}
      {{car.make}} {{car.model}} {{car.color}}
    {{/each}}
  {{/group}}
  ```
  Any change to `dealershipName` or the `dealers` collection will cause the
  entire group to be re-rendered. However, changes to the `cars` collection
  will be re-rendered individually (as normal).

  Note that `group` behavior is also disabled by specifying an `itemViewClass`.

  @method each
  @for Ember.Handlebars.helpers
  @param [name] {String} name for item (used with `in`)
  @param [path] {String} path
  @param [options] {Object} Handlebars key/value pairs of options
  @param [options.itemViewClass] {String} a path to a view class used for each item
  @param [options.itemController] {String} name of a controller to be created for each item
  @param [options.groupedRows] {boolean} enable normal item-by-item rendering when inside a `#group` helper
*/
function eachHelper(path, options) {
  var ctx, helperName = 'each';

  if (arguments.length === 4) {
    Ember.assert("If you pass more than one argument to the each helper, it must be in the form #each foo in bar", arguments[1] === "in");

    var keywordName = arguments[0];


    options = arguments[3];
    path = arguments[2];

    helperName += ' ' + keywordName + ' in ' + path;

    if (path === '') { path = "this"; }

    options.hash.keyword = keywordName;

  } else if (arguments.length === 1) {
    options = path;
    path = 'this';
  } else {
    helperName += ' ' + path;
  }

  options.hash.dataSourceBinding = path;
  // Set up emptyView as a metamorph with no tag
  //options.hash.emptyViewClass = Ember._MetamorphView;

  // can't rely on this default behavior when use strict
  ctx = this || window;

  options.helperName = options.helperName || helperName;

  if (options.data.insideGroup && !options.hash.groupedRows && !options.hash.itemViewClass) {
    new GroupedEach(ctx, path, options).render();
  } else {
    // ES6TODO: figure out how to do this without global lookup.
    return helpers.collection.call(ctx, 'Ember.Handlebars.EachView', options);
  }
}

export {
  EachView,
  GroupedEach,
  eachHelper
};

