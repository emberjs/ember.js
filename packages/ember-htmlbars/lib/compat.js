import Ember from 'ember-metal/core'; // Handlebars
import {
  SafeString,
  escapeExpression
} from 'ember-htmlbars/utils/string';

var EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};

EmberHandlebars.SafeString = SafeString;
EmberHandlebars.Utils =  {
  escapeExpression: escapeExpression
};

export default EmberHandlebars;
