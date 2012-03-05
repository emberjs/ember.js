// ==========================================================================
// Project:  Ember Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/system/array_proxy');

var get = Ember.get, set = Ember.set;

/**
  @class

  Ember.ArrayController provides a way for you to publish an array of objects for
  Ember.CollectionView or other controllers to work with. You can just work directly 
  with the controller object as if it were an array itself. Ember.ArrayController
  comes with an empty array ready for you to use by default. 

  For example, imagine you have some objects and want to list them in a view. 
  Create an Ember.ArrayController and just push those objects to it:
      
      var someObject = Ember.Object.create({
        title: 'Ember rocks!'
        isValid: true
      });
      
      var anotherObject = Ember.Object.create({
        title: 'IE6 is the best browser ever!',
        isValid: false
      });

      MyApp.listController = Ember.ArrayController.create();

      MyApp.listController.pushObjects([someObject, anotherObject]);

  Then, create a view that binds to your new controller:

      <ul>
      {{#each MyApp.listController}}
        <li {{bindAttr class="isValid"}}>{{title}}</li>
      {{/each}}
      </ul>  
  
  @extends Ember.ArrayProxy
*/

Ember.ArrayController = Ember.ArrayProxy.extend({
  init: function() {
    this._super();
    set(this, 'content', Ember.A());
  }
});
