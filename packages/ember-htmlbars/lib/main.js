/**
  Ember templates are executed by [HTMLBars](https://github.com/tildeio/htmlbars),
  an HTML-friendly version of [Handlebars](http://handlebarsjs.com/). Any valid Handlebars syntax is valid in an Ember template.

  ### Showing a property

  Templates manage the flow of an application's UI, and display state (through
  the DOM) to a user. For example, given a component with the property "name",
  that component's template can use the name in several ways:

  ```javascript
  // app/components/person.js
  export default Ember.Component.extend({
    name: 'Jill'
  });
  ```

  ```handlebars
  {{! app/components/person.hbs }}
  {{name}}
  <div>{{name}}</div>
  <span data-name={{name}}></span>
  ```

  Any time the "name" property on the component changes, the DOM will be
  updated.

  Properties can be chained as well:

  ```handlebars
  {{aUserModel.name}}
  <div>{{listOfUsers.firstObject.name}}</div>
  ```

  ### Using Ember helpers

  When content is passed in mustaches `{{}}`, Ember will first try to find a helper
  or component with that name. For example, the `if` helper:

  ```handlebars
  {{if name "I have a name" "I have no name"}}
  <span data-has-name={{if name true}}></span>
  ```

  The returned value is placed where the `{{}}` is called. The above style is
  called "inline". A second style of helper usage is called "block". For example:

  ```handlebars
  {{#if name}}
    I have a name
  {{else}}
    I have no name
  {{/if}}
  ```

  The block form of helpers allows you to control how the UI is created based
  on the values of properties.

  A third form of helper is called "nested". For example here the concat
  helper will add " Doe" to a displayed name if the person has no last name:

  ```handlebars
  <span data-name={{concat firstName (
   if lastName (concat " " lastName) "Doe"
  )}}></span>
  ```

  Ember's built-in helpers are described under the [Ember.Templates.helpers](/api/classes/Ember.Templates.helpers.html)
  namespace. Documentation on creating custom helpers can be found under
  [Ember.Helper](/api/classes/Ember.Helper.html).

  ### Invoking a Component

  Ember components represent state to the UI of an application. Further
  reading on components can be found under [Ember.Component](/api/classes/Ember.Component.html).

  @module ember
  @submodule ember-templates
  @main ember-templates
  @public
*/

/**

  [HTMLBars](https://github.com/tildeio/htmlbars) is a [Handlebars](http://handlebarsjs.com/)
  compatible templating engine used by Ember.js. The classes and namespaces
  covered by this documentation attempt to focus on APIs for interacting
  with HTMLBars itself. For more general guidance on Ember.js templates and
  helpers, please see the [ember-templates](/api/modules/ember-templates.html)
  package.

  @module ember
  @submodule ember-htmlbars
  @main ember-htmlbars
  @public
*/
import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';

import {
  precompile,
  compile,
  template,
  registerPlugin
} from 'ember-template-compiler';

import makeBoundHelper from 'ember-htmlbars/system/make_bound_helper';

import {
  registerHelper
} from 'ember-htmlbars/helpers';
import {
  ifHelper,
  unlessHelper
} from 'ember-htmlbars/helpers/if_unless';
import withHelper from 'ember-htmlbars/helpers/with';
import locHelper from 'ember-htmlbars/helpers/loc';
import logHelper from 'ember-htmlbars/helpers/log';
import eachHelper from 'ember-htmlbars/helpers/each';
import eachInHelper from 'ember-htmlbars/helpers/each-in';
import normalizeClassHelper from 'ember-htmlbars/helpers/-normalize-class';
import concatHelper from 'ember-htmlbars/helpers/-concat';
import joinClassesHelper from 'ember-htmlbars/helpers/-join-classes';
import legacyEachWithControllerHelper from 'ember-htmlbars/helpers/-legacy-each-with-controller';
import legacyEachWithKeywordHelper from 'ember-htmlbars/helpers/-legacy-each-with-keyword';
import htmlSafeHelper from 'ember-htmlbars/helpers/-html-safe';
import DOMHelper from 'ember-htmlbars/system/dom-helper';
import Helper, { helper as makeHelper } from 'ember-htmlbars/helper';
import GlimmerComponent from 'ember-htmlbars/glimmer-component';

// importing adds template bootstrapping
// initializer to enable embedded templates
import 'ember-htmlbars/system/bootstrap';

// importing ember-htmlbars/compat updates the
// Ember.Handlebars global if htmlbars is enabled
import 'ember-htmlbars/compat';

registerHelper('if', ifHelper);
registerHelper('unless', unlessHelper);
registerHelper('with', withHelper);
registerHelper('loc', locHelper);
registerHelper('log', logHelper);
registerHelper('each', eachHelper);
registerHelper('each-in', eachInHelper);
registerHelper('-normalize-class', normalizeClassHelper);
registerHelper('concat', concatHelper);
registerHelper('-join-classes', joinClassesHelper);
registerHelper('-html-safe', htmlSafeHelper);

if (Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
  registerHelper('-legacy-each-with-controller', legacyEachWithControllerHelper);
  registerHelper('-legacy-each-with-keyword', legacyEachWithKeywordHelper);
}

Ember.HTMLBars = {
  template: template,
  compile: compile,
  precompile: precompile,
  makeBoundHelper: makeBoundHelper,
  registerPlugin: registerPlugin,
  DOMHelper
};

if (isEnabled('ember-htmlbars-component-generation')) {
  Ember.GlimmerComponent = GlimmerComponent;
}

Helper.helper = makeHelper;
Ember.Helper = Helper;
