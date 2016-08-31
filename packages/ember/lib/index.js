import require, { has } from 'require';
import isEnabled from 'ember-metal/features';

import { ENV } from 'ember-environment';
import Ember from 'ember-metal'; // for reexports
import { String as EmberString } from 'ember-runtime';

// require the main entry points for each of these packages
// this is so that the global exports occur properly
import 'ember-views';
import 'ember-routing';
import 'ember-application';
import 'ember-extension-support';
import {
  Component,
  Helper,
  helper,
  Checkbox,
  TextField,
  TextArea,
  LinkComponent,
  htmlSafe,
  template,
  escapeExpression,
  isHTMLSafe,
  makeBoundHelper,
  getTemplates,
  setTemplates,
  _getSafeString,
  _Renderer
} from 'ember-glimmer';

Ember.String = EmberString;
Ember.Component = Component;
Helper.helper = helper;
Ember.Helper = Helper;
Ember.Checkbox = Checkbox;
Ember.TextField = TextField;
Ember.TextArea = TextArea;
Ember.LinkComponent = LinkComponent;
Ember._Renderer = _Renderer;

if (ENV.EXTEND_PROTOTYPES.String) {
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };
}

let EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};
let EmberHTMLBars = Ember.HTMLBars = Ember.HTMLBars || {};
let EmberHandleBarsUtils = EmberHandlebars.Utils = EmberHandlebars.Utils || {};

Object.defineProperty(EmberHandlebars, 'SafeString', {
  get: _getSafeString
});

EmberHTMLBars.template = EmberHandlebars.template = template;
EmberHandleBarsUtils.escapeExpression = escapeExpression;
EmberString.htmlSafe = htmlSafe;

if (isEnabled('ember-string-ishtmlsafe')) {
  EmberString.isHTMLSafe = isHTMLSafe;
}
EmberHTMLBars.makeBoundHelper = makeBoundHelper;

/**
 Global hash of shared templates. This will automatically be populated
 by the build tools so that you can store your Handlebars templates in
 separate files that get loaded into JavaScript at buildtime.

 @property TEMPLATES
 @for Ember
 @type Object
 @private
 */
Object.defineProperty(Ember, 'TEMPLATES', {
  get: getTemplates,
  set: setTemplates,
  configurable: false,
  enumerable: false
});

import { runLoadHooks } from 'ember-runtime/system/lazy_load';

if (has('ember-template-compiler')) {
  require('ember-template-compiler');
}

// do this to ensure that Ember.Test is defined properly on the global
// if it is present.
if (has('ember-testing')) {
  require('ember-testing');
}

runLoadHooks('Ember');

/**
@module ember
*/

export default Ember;
