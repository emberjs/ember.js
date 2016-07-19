import Ember from 'ember-metal/core'; // reexports
import template from './template';
import {
  SafeString,
  escapeExpression,
  htmlSafe,
  isHTMLSafe
} from './string';
import EmberStringUtil from 'ember-runtime/system/string';
import isEnabled from 'ember-metal/features';
import { deprecate } from 'ember-metal/debug';


export let EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};
export let EmberHTMLBars = Ember.HTMLBars = Ember.HTMLBars || {};
let EmberHandleBarsUtils = EmberHandlebars.Utils || {};

if (isEnabled('ember-string-ishtmlsafe')) {
  Object.defineProperty(EmberHandlebars, 'SafeString', {
    get() {
      deprecate(
        'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe',
        false,
        {
          id: 'ember-htmlbars.ember-handlebars-safestring',
          until: '3.0.0',
          url: 'http://emberjs.com/deprecations/v2.x#toc_use-ember-string-htmlsafe-over-ember-handlebars-safestring'
        }
      );

      return SafeString;
    }
  });
} else {
  EmberHandlebars.SafeString = SafeString;
}

EmberHTMLBars.SafeString = SafeString;
EmberHTMLBars.template = EmberHandlebars.template = template;
EmberHandleBarsUtils.escapeExpression = escapeExpression;
EmberStringUtil.htmlSafe = htmlSafe;

if (isEnabled('ember-string-ishtmlsafe')) {
  EmberStringUtil.isHTMLSafe = isHTMLSafe;
}
