import Ember from 'ember-metal/core';
import { deprecateFunc } from 'ember-metal/debug';
import {
  SafeString,
  escapeExpression
} from 'ember-htmlbars/utils/string';

var EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};

EmberHandlebars.SafeString = deprecateFunc('Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe', { id: 'ember-htmlbars.ember-handlebars-safestring', until: '3.0.0' }, SafeString);
EmberHandlebars.Utils =  {
  escapeExpression: escapeExpression
};

export default EmberHandlebars;
