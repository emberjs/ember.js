import Ember from 'ember-metal/core'; // for Handlebars export
import { htmlSafe } from 'ember-htmlbars/utils/string';
import { deprecate } from 'ember-metal/debug';
import {
  escapeExpression
} from 'ember-htmlbars/utils/string';

var EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};

EmberHandlebars.SafeString = function(value) {
  deprecate(
    'Ember.Handlebars.SafeString is deprecated in favor of Ember.String.htmlSafe',
    false,
    {
      id: 'ember-htmlbars.ember-handlebars-safestring',
      until: '3.0.0',
      url: 'http://emberjs.com/deprecations/v2.x#toc_use-ember-string-htmlsafe-over-ember-handlebars-safestring'
    }
  );

  return htmlSafe(value);
};

EmberHandlebars.Utils =  {
  escapeExpression: escapeExpression
};

export default EmberHandlebars;
