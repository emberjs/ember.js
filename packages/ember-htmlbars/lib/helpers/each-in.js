/**
@module ember
@submodule ember-templates
*/

import isEnabled from 'ember-metal/features';
import shouldDisplay from 'ember-views/streams/should_display';

if (isEnabled('ember-htmlbars-each-in')) {
  /**
    The `{{each-in}}` helper loops over properties on an object. It is unbound,
    in that new (or removed) properties added to the target object will not be
    rendered.

    For example, given a `user` object that looks like:

    ```javascript
    {
      "name": "Shelly Sails",
      "age": 42
    }
    ```

    This template would display all properties on the `user`
    object in a list:

    ```handlebars
    <ul>
    {{#each-in user as |key value|}}
      <li>{{key}}: {{value}}</li>
    {{/each-in}}
    </ul>
    ```

    Outputting their name and age.

    @method each-in
    @for Ember.Templates.helpers
    @public
  */
  var eachInHelper = function([ object ], hash, blocks) {
    var objKeys, prop, i;
    objKeys = object ? Object.keys(object) : [];
    if (shouldDisplay(objKeys)) {
      for (i = 0; i < objKeys.length; i++) {
        prop = objKeys[i];
        blocks.template.yieldItem(prop, [prop, object[prop]]);
      }
    } else if (blocks.inverse.yield) {
      blocks.inverse.yield();
    }
  };
}

export default eachInHelper;
