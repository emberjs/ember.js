import Ember from "ember-metal/core";
import helpers from "ember-htmlbars/helpers";
import {
  template,
  compile
} from "ember-template-compiler";
import {
  registerHandlebarsCompatibleHelper as compatRegisterHelper,
  handlebarsHelper as compatHandlebarsHelper
} from "ember-htmlbars/compat/helper";
import compatHandlebarsGet from "ember-htmlbars/compat/handlebars-get";
import compatMakeBoundHelper from "ember-htmlbars/compat/make-bound-helper";
import compatRegisterBoundHelper from "ember-htmlbars/compat/register-bound-helper";
import compatPrecompile from "ember-htmlbars/compat/precompile";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import {
  SafeString,
  escapeExpression
} from "ember-htmlbars/utils/string";

var EmberHandlebars;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  EmberHandlebars = Ember.Handlebars = { };
  EmberHandlebars.helpers = helpers;
  EmberHandlebars.helper = compatHandlebarsHelper;
  EmberHandlebars.registerHelper = compatRegisterHelper;
  EmberHandlebars.registerBoundHelper = compatRegisterBoundHelper;
  EmberHandlebars.makeBoundHelper = compatMakeBoundHelper;
  EmberHandlebars.get = compatHandlebarsGet;
  EmberHandlebars.precompile = compatPrecompile;
  EmberHandlebars.compile = compile;
  EmberHandlebars.template = template;
  EmberHandlebars.makeViewHelper = makeViewHelper;

  EmberHandlebars.SafeString = SafeString;
  EmberHandlebars.Utils =  {
    escapeExpression: escapeExpression
  };
}

export default EmberHandlebars;
