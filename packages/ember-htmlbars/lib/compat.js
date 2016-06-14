import Ember from 'ember-metal/core'; // for Handlebars export
import { deprecate } from 'ember-metal/debug';
import {
  SafeString,
  escapeExpression
} from 'ember-htmlbars/utils/string';

let EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};
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

EmberHandlebars.Utils =  {
  escapeExpression: escapeExpression
};

export default EmberHandlebars;
