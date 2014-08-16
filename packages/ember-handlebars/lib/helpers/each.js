
/**
@module ember
@submodule ember-handlebars
*/
import Ember from "ember-metal/core"; // Ember.assert;, Ember.K
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
  var self = this;
  var normalized = EmberHandlebars.normalizePath(context, path, options.data);

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

    var content = this.content;
    var contentLength = get(content, 'length');
    var options = this.options;
    var data = options.data;
    var template = this.template;

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
  The `{{#each}}` helper loops over elements in a collection. It is an extension
  of the base Handlebars `{{#each}}` helper.

  The default behavior of `{{#each}}` is to yield its inner block once for every
  item in an array. Each yield will provide the item as the context of the block.

  ```javascript
  var developers = [{name: 'Yehuda'},{name: 'Tom'}, {name: 'Paul'}];
  ```

  ```handlebars
  {{#each developers}}
    {{name}}
    {{! `this` is each developer }}
  {{/each}}
  ```

  `{{#each}}` supports an alternative syntax with element naming. This preserves
  context of the yielded block:

  ```handlebars
  {{#each person in developers}}
    {{person.name}}
    {{! `this` is whatever it was outside the #each }}
  {{/each}}
  ```

  The same rules apply to arrays of primitives, but the items may need to be
  references with `{{this}}`.

  ```javascript
  var developerNames = ['Yehuda', 'Tom', 'Paul']
  ```

  ```handlebars
  {{#each developerNames}}
    {{this}}
  {{/each}}
  ```

  ### {{else}} condition

  `{{#each}}` can have a matching `{{else}}`. The contents of this block will render
  if the collection is empty.

  ```
  {{#each person in developers}}
    {{person.name}}
  {{else}}
    <p>Sorry, nobody is available for this task.</p>
  {{/each}}
  ```

  ### Specifying an alternative view for each item

  `itemViewClass` can control which view will be used during the render of each
  item's template.

  The following template:

  ```handlebars
  <ul>
  {{#each developers itemViewClass="person"}}
    {{name}}
  {{/each}}
  </ul>
  ```

  Will use the following view for each item

  ```javascript
  App.PersonView = Ember.View.extend({
    tagName: 'li'
  });
  ```

  Resulting in HTML output that looks like the following:

  ```html
  <ul>
    <li class="ember-view">Yehuda</li>
    <li class="ember-view">Tom</li>
    <li class="ember-view">Paul</li>
  </ul>
  ```

  `itemViewClass` also enables a non-block form of `{{each}}`. The view
  must {{#crossLink "Ember.View/toc_templates"}}provide its own template{{/crossLink}},
  and then the block should be dropped. An example that outputs the same HTML
  as the previous one:

  ```javascript
  App.PersonView = Ember.View.extend({
    tagName: 'li',
    template: '{{name}}'
  });
  ```

  ```handlebars
  <ul>
    {{each developers itemViewClass="person"}}
  </ul>
  ```

  ### Specifying an alternative view for no items (else)

  The `emptyViewClass` option provides the same flexibility to the `{{else}}`
  case of the each helper.

  ```javascript
  App.NoPeopleView = Ember.View.extend({
    tagName: 'li',
    template: 'No person is available, sorry'
  });
  ```

  ```handlebars
  <ul>
  {{#each developers emptyViewClass="no-people"}}
    <li>{{name}}</li>
  {{/each}}
  </ul>
  ```

  ### Wrapping each item in a controller

  Controllers in Ember manage state and decorate data. In many cases,
  providing a controller for each item in a list can be useful.
  Specifically, an {{#crossLink "Ember.ObjectController"}}Ember.ObjectController{{/crossLink}}
  should probably be used. Item controllers are passed the item they
  will present as a `model` property, and an object controller will
  proxy property lookups to `model` for us.

  This allows state and decoration to be added to the controller
  while any other property lookups are delegated to the model. An example:

  ```javascript
  App.RecruitController = Ember.ObjectController.extend({
    isAvailableForHire: function() {
      return !this.get('isEmployed') && this.get('isSeekingWork');
    }.property('isEmployed', 'isSeekingWork')
  })
  ```

  ```handlebars
  {{#each person in developers itemController="recruit"}}
    {{person.name}} {{#if person.isAvailableForHire}}Hire me!{{/if}}
  {{/each}}
  ```

  ### (Experimental) Grouped Each

  If a list's membership often changes, but properties of items in that
  group rarely change, a significant improvement in template rendering
  time can be achieved by using the experimental [group helper](https://github.com/emberjs/group-helper).

  ```handlebars
  {{#group}}
    {{#each people}}
      {{firstName}} {{lastName}}
    {{/each}}
  {{/group}}
  ```

  When the membership of `people` changes, or when any property changes, the entire
  `{{#group}}` block will be re-rendered.

  An `{{#each}}` inside the `{{#group}}` helper can opt-out of the special group
  behavior by passing the `groupedRows` option. For example:

  ```handlebars
  {{#group}}
    {{#each dealers}}
      {{! uses group's special behavior }}
      {{firstName}} {{lastName}}
    {{/each}}

    {{#each car in cars groupedRows=true}}
      {{! does not use group's special behavior }}
      {{car.make}} {{car.model}} {{car.color}}
    {{/each}}
  {{/group}}
  ```

  Any change to the `dealers` collection will cause the entire group to be re-rendered.
  Changes to the `cars` collection will be re-rendered individually, as they are with
  normal `{{#each}}` usage.

  `{{#group}}` is implemented with an `itemViewClass`, so specifying an `itemViewClass`
  on an `{{#each}}` will also disable the special re-rendering behavior.

  @method each
  @for Ember.Handlebars.helpers
  @param [name] {String} name for item (used with `in`)
  @param [path] {String} path
  @param [options] {Object} Handlebars key/value pairs of options
  @param [options.itemViewClass] {String} a path to a view class used for each item
  @param [options.emptyViewClass] {String} a path to a view class used for each item
  @param [options.itemController] {String} name of a controller to be created for each item
  @param [options.groupedRows] {boolean} enable normal item-by-item rendering when inside a `#group` helper
*/
function eachHelper(path, options) {
  var ctx;
  var helperName = 'each';

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
    return helpers.collection.call(ctx, EmberHandlebars.EachView, options);
  }
}

export {
  EachView,
  GroupedEach,
  eachHelper
};

