import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';

import {
  precompile,
  compile,
  template,
  registerPlugin
} from 'ember-template-compiler';

import makeViewHelper from 'ember-htmlbars/system/make-view-helper';
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
import bindAttrClassHelper from 'ember-htmlbars/helpers/-bind-attr-class';
import normalizeClassHelper from 'ember-htmlbars/helpers/-normalize-class';
import concatHelper from 'ember-htmlbars/helpers/-concat';
import joinClassesHelper from 'ember-htmlbars/helpers/-join-classes';
import legacyEachWithControllerHelper from 'ember-htmlbars/helpers/-legacy-each-with-controller';
import legacyEachWithKeywordHelper from 'ember-htmlbars/helpers/-legacy-each-with-keyword';
import getHelper from 'ember-htmlbars/helpers/-get';
import htmlSafeHelper from 'ember-htmlbars/helpers/-html-safe';
import DOMHelper from 'ember-htmlbars/system/dom-helper';
import Helper, { helper as makeHelper } from 'ember-htmlbars/helper';

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
if (isEnabled('ember-htmlbars-each-in')) {
  registerHelper('each-in', eachInHelper);
}
registerHelper('-bind-attr-class', bindAttrClassHelper);
registerHelper('-normalize-class', normalizeClassHelper);
registerHelper('concat', concatHelper);
registerHelper('-join-classes', joinClassesHelper);
registerHelper('-legacy-each-with-controller', legacyEachWithControllerHelper);
registerHelper('-legacy-each-with-keyword', legacyEachWithKeywordHelper);
if (isEnabled('ember-htmlbars-get-helper')) {
  registerHelper('-get', getHelper);
}
registerHelper('-html-safe', htmlSafeHelper);

Ember.HTMLBars = {
  _registerHelper: registerHelper,
  template: template,
  compile: compile,
  precompile: precompile,
  makeViewHelper: makeViewHelper,
  makeBoundHelper: makeBoundHelper,
  registerPlugin: registerPlugin,
  DOMHelper
};

if (isEnabled('ember-htmlbars-helper')) {
  Helper.helper = makeHelper;
  Ember.Helper = Helper;
}
