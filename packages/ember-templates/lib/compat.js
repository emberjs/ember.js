import Ember from 'ember-metal/core'; // reexports
import template from './template';
import {
  getSafeString,
  escapeExpression,
  htmlSafe,
  isHTMLSafe
} from './string';
import DOMHelper from './dom-helper';
import EmberStringUtil from 'ember-runtime/system/string';
import isEnabled from 'ember-metal/features';
import makeBoundHelper from './make-bound-helper';

export let EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};
export let EmberHTMLBars = Ember.HTMLBars = Ember.HTMLBars || {};
export let EmberHandleBarsUtils = EmberHandlebars.Utils = EmberHandlebars.Utils || {};

Object.defineProperty(EmberHandlebars, 'SafeString', {
  get: getSafeString
});

EmberHTMLBars.template = EmberHandlebars.template = template;
EmberHTMLBars.DOMHelper = DOMHelper;
EmberHandleBarsUtils.escapeExpression = escapeExpression;
EmberStringUtil.htmlSafe = htmlSafe;

if (isEnabled('ember-string-ishtmlsafe')) {
  EmberStringUtil.isHTMLSafe = isHTMLSafe;
}
EmberHTMLBars.makeBoundHelper = makeBoundHelper;
