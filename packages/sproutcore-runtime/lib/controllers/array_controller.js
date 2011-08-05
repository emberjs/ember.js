// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/system/array_proxy');

/**
  @class

  SC.ArrayController provides a way for you to publish an array of objects for
  SC.CollectionView or other controllers to work with.  To work with an
  ArrayController, set the content property to the array you want the controller
  to manage.  Then work directly with the controller object as if it were the
  array itself.

  For example, imagine you wanted to display a list of items fetched via an XHR
  request. Create an SC.ArrayController and set its `content` property:

      MyApp.listController = SC.ArrayController.create();

      $.get('people.json', function(data) {
        MyApp.listController.set('content', data);
      });

  Then, create a view that binds to your new controller:

    {{collection contentBinding="MyApp.listController"}}
      {{content.firstName}} {{content.lastName}}
    {{/collection}}

  The advantage of using an array controller is that you only have to set up
  your view bindings once; to change what's displayed, simply swap out the
  `content` property on the controller.

  @extends SC.ArrayProxy
*/

SC.ArrayController = SC.ArrayProxy.extend();
