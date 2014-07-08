import EmberHandlebars from "ember-handlebars-compiler";
import Ember from "ember-metal/core"; // to add to globals

import {runLoadHooks} from "ember-runtime/system/lazy_load";
import bootstrap from "ember-handlebars/loader";

import {normalizePath, template, makeBoundHelper, registerBoundHelper,
    resolveHash, resolveParams, getEscaped, handlebarsGet, evaluateUnboundHelper,
    helperMissingHelper, blockHelperMissingHelper
} from "ember-handlebars/ext";


// side effect of extending StringUtils of htmlSafe
import "ember-handlebars/string";

import resolvePaths from "ember-handlebars/helpers/shared";
import {bind, _triageMustacheHelper, resolveHelper, bindHelper, boundIfHelper, unboundIfHelper, withHelper, ifHelper, unlessHelper, bindAttrHelper, bindAttrHelperDeprecated, bindClasses} from "ember-handlebars/helpers/binding";

import collectionHelper from "ember-handlebars/helpers/collection";
import {ViewHelper, viewHelper} from "ember-handlebars/helpers/view";
import unboundHelper from "ember-handlebars/helpers/unbound";
import {logHelper, debuggerHelper} from "ember-handlebars/helpers/debug";
import {EachView, GroupedEach, eachHelper} from "ember-handlebars/helpers/each";

import templateHelper from "ember-handlebars/helpers/template";
import partialHelper from "ember-handlebars/helpers/partial";
import yieldHelper from "ember-handlebars/helpers/yield";
import locHelper from "ember-handlebars/helpers/loc";


import Checkbox from "ember-handlebars/controls/checkbox";
import {Select, SelectOption, SelectOptgroup} from "ember-handlebars/controls/select";
import TextArea from "ember-handlebars/controls/text_area";
import TextField from "ember-handlebars/controls/text_field";
import TextSupport from "ember-handlebars/controls/text_support";
import TextSupport from "ember-handlebars/controls/text_support";
import {inputHelper, textareaHelper} from "ember-handlebars/controls"


import ComponentLookup from "ember-handlebars/component_lookup";
import {_HandlebarsBoundView, SimpleHandlebarsView} from "ember-handlebars/views/handlebars_bound_view";
import {_SimpleMetamorphView, _MetamorphView, _Metamorph} from "ember-handlebars/views/metamorph_view";

/**
Ember Handlebars

@module ember
@submodule ember-handlebars
@requires ember-views
*/

// Ember.Handlebars.Globals
EmberHandlebars.bootstrap = bootstrap;
EmberHandlebars.template = template;
EmberHandlebars.makeBoundHelper = makeBoundHelper;
EmberHandlebars.registerBoundHelper = registerBoundHelper;
EmberHandlebars.resolveHash = resolveHash;
EmberHandlebars.resolveParams = resolveParams;
EmberHandlebars.resolveHelper = resolveHelper;
EmberHandlebars.get = handlebarsGet;
EmberHandlebars.getEscaped = getEscaped;
EmberHandlebars.evaluateUnboundHelper = evaluateUnboundHelper;
EmberHandlebars.bind = bind;
EmberHandlebars.bindClasses = bindClasses;
EmberHandlebars.EachView = EachView;
EmberHandlebars.GroupedEach = GroupedEach;
EmberHandlebars.resolvePaths = resolvePaths;
EmberHandlebars.ViewHelper = ViewHelper;
EmberHandlebars.normalizePath = normalizePath;


// Ember Globals
Ember.Handlebars = EmberHandlebars;
Ember.ComponentLookup = ComponentLookup;
Ember._SimpleHandlebarsView = SimpleHandlebarsView;
Ember._HandlebarsBoundView = _HandlebarsBoundView;
Ember._SimpleMetamorphView = _SimpleMetamorphView;
Ember._MetamorphView = _MetamorphView;
Ember._Metamorph = _Metamorph;
Ember.TextSupport = TextSupport;
Ember.Checkbox = Checkbox;
Ember.Select = Select;
Ember.SelectOption = SelectOption;
Ember.SelectOptgroup = SelectOptgroup;
Ember.TextArea = TextArea;
Ember.TextField = TextField;
Ember.TextSupport = TextSupport;

// register helpers
EmberHandlebars.registerHelper('helperMissing', helperMissingHelper);
EmberHandlebars.registerHelper('blockHelperMissing', blockHelperMissingHelper);
EmberHandlebars.registerHelper('bind', bindHelper);
EmberHandlebars.registerHelper('boundIf', boundIfHelper);
EmberHandlebars.registerHelper('_triageMustache', _triageMustacheHelper);
EmberHandlebars.registerHelper('unboundIf', unboundIfHelper);
EmberHandlebars.registerHelper('with', withHelper);
EmberHandlebars.registerHelper('if', ifHelper);
EmberHandlebars.registerHelper('unless', unlessHelper);
EmberHandlebars.registerHelper('bind-attr', bindAttrHelper);
EmberHandlebars.registerHelper('bindAttr', bindAttrHelperDeprecated);
EmberHandlebars.registerHelper('collection', collectionHelper);
EmberHandlebars.registerHelper("log", logHelper);
EmberHandlebars.registerHelper("debugger", debuggerHelper);
EmberHandlebars.registerHelper("each", eachHelper);
EmberHandlebars.registerHelper("loc", locHelper);
EmberHandlebars.registerHelper("partial", partialHelper);
EmberHandlebars.registerHelper("template", templateHelper);
EmberHandlebars.registerHelper("yield", yieldHelper);
EmberHandlebars.registerHelper("view", viewHelper);
EmberHandlebars.registerHelper("unbound", unboundHelper);
EmberHandlebars.registerHelper("input", inputHelper);
EmberHandlebars.registerHelper("textarea", textareaHelper);

// run load hooks
runLoadHooks('Ember.Handlebars', EmberHandlebars);

export default EmberHandlebars;
