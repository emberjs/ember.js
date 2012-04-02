// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/system/array_proxy');

/**
  @class

  Ember.ArrayController provides a way for you to publish a collection of objects
  so that you can easily bind to the collection from a Handlebars #each helper,
  an Ember.CollectionView, or other controllers.

  The advantage of using an ArrayController is that you only have to set up
  your view bindings once; to change what's displayed, simply swap out the
  `content` property on the controller.

  For example, imagine you wanted to display a list of items fetched via an XHR
  request. Create an Ember.ArrayController and set its `content` property:

      MyApp.listController = Ember.ArrayController.create();

      $.get('people.json', function(data) {
        MyApp.listController.set('content', data);
      });

  Then, create a view that binds to your new controller:

      {{#each MyApp.listController}}
        {{firstName}} {{lastName}}
      {{/each}}

  Although you are binding to the controller, the behavior of this controller
  is to pass through any methods or properties to the underlying array. This
  capability comes from `Ember.ArrayProxy`, which this class inherits from.

  Note: As of this writing, `ArrayController` does not add any functionality
  to its superclass, `ArrayProxy`. The Ember team plans to add additional
  controller-specific functionality in the future, e.g. single or multiple
  selection support. If you are creating something that is conceptually a
  controller, use this class.

  @extends Ember.ArrayProxy
*/

Ember.ArrayController = Ember.ArrayProxy.extend();
