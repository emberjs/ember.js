import Ember from 'ember-metal/core'; // for Handlebars export
import { deprecateFunc } from 'ember-metal/debug';

import {
  SafeString,
  escapeExpression
} from 'ember-htmlbars/utils/string';

var EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};

EmberHandlebars.SafeString = deprecateFunc(
  'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe',
  {
    id: 'ember-htmlbars.ember-handlebars-safestring',
    until: '3.0.0',
    url: 'http://emberjs.com/deprecations/v2.x#toc_use-ember-string-htmlsafe-over-ember-handlebars-safestring'
  },
  SafeString);

EmberHandlebars.Utils =  {
  escapeExpression: escapeExpression
};

export default EmberHandlebars;
