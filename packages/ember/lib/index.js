import require, { has } from 'require';
import isEnabled from 'ember-metal/features';

import { ENV } from 'ember-environment';

import {
  default as Ember,
  computed,
  alias,
  ComputedProperty,
  cacheFor
} from 'ember-metal';

computed.alias = alias;
Ember.computed = computed;
Ember.ComputedProperty = ComputedProperty;
Ember.cacheFor = cacheFor;

import {
  Registry,
  Container,
  getOwner,
  setOwner
} from 'container';

Ember.Container = Container;
Ember.Registry = Registry;
Ember.getOwner = getOwner;
Ember.setOwner = setOwner;

import {
  String as EmberString,
  Object as EmberObject,
  RegistryProxyMixin,
  ContainerProxyMixin,
  compare,
  copy,
  isEqual,
  inject,
  Array as EmberArray,
  Copyable,
  Freezable,
  FROZEN_ERROR,
  MutableEnumerable,
  MutableArray,
  TargetActionSupport,
  Evented,
  PromiseProxyMixin,
  Observable,
  typeOf,
  isArray,
  onLoad,
  runLoadHooks,
  Controller,
  ControllerMixin,
  Service,
  _ProxyMixin,
  RSVP,
  Comparable,
  Namespace,
  Enumerable,
  ArrayProxy,
  ObjectProxy,
  ActionHandler,
  CoreObject,
  NativeArray,
  isNamespaceSearchDisabled,
  setNamespaceSearchDisabled,
  getStrings,
  setStrings,

  // computed macros
  empty,
  notEmpty,
  none,
  not,
  bool,
  match,
  equal,
  gt,
  gte,
  lt,
  lte,
  oneWay,
  readOnly,
  defaultTo,
  deprecatingAlias,
  and,
  or,
  any,

  // reduced computed macros
  sum,
  min,
  max,
  map,
  sort,
  setDiff,
  mapBy,
  filter,
  filterBy,
  uniq,
  uniqBy,
  union,
  intersect,
  collect
} from 'ember-runtime';

Ember.String = EmberString;
Ember.Object = EmberObject;
Ember._RegistryProxyMixin = RegistryProxyMixin;
Ember._ContainerProxyMixin = ContainerProxyMixin;
Ember.compare = compare;
Ember.copy = copy;
Ember.isEqual = isEqual;
Ember.inject = inject;
Ember.Array = EmberArray;
Ember.Comparable = Comparable;
Ember.Enumerable = Enumerable;
Ember.ArrayProxy = ArrayProxy;
Ember.ObjectProxy = ObjectProxy;
Ember.ActionHandler = ActionHandler;
Ember.CoreObject = CoreObject;
Ember.NativeArray = NativeArray;
Ember.Copyable = Copyable;
Ember.Freezable = Freezable;
Ember.FROZEN_ERROR = FROZEN_ERROR;
Ember.MutableEnumerable = MutableEnumerable;
Ember.MutableArray = MutableArray;
Ember.TargetActionSupport = TargetActionSupport;
Ember.Evented = Evented;
Ember.PromiseProxyMixin = PromiseProxyMixin;
Ember.Observable = Observable;
Ember.typeOf = typeOf;
Ember.isArray = isArray;
Ember.Object = EmberObject;
Ember.onLoad = onLoad;
Ember.runLoadHooks = runLoadHooks;
Ember.Controller = Controller;
Ember.ControllerMixin = ControllerMixin;
Ember.Service = Service;
Ember._ProxyMixin = _ProxyMixin;
Ember.RSVP = RSVP;
Ember.Namespace = Namespace;

// ES6TODO: this seems a less than ideal way/place to add properties to Ember.computed
computed.empty = empty;
computed.notEmpty = notEmpty;
computed.none = none;
computed.not = not;
computed.bool = bool;
computed.match = match;
computed.equal = equal;
computed.gt = gt;
computed.gte = gte;
computed.lt = lt;
computed.lte = lte;
computed.oneWay = oneWay;
computed.reads = oneWay;
computed.readOnly = readOnly;
computed.defaultTo = defaultTo;
computed.deprecatingAlias = deprecatingAlias;
computed.and = and;
computed.or = or;
computed.any = any;

computed.sum = sum;
computed.min = min;
computed.max = max;
computed.map = map;
computed.sort = sort;
computed.setDiff = setDiff;
computed.mapBy = mapBy;
computed.filter = filter;
computed.filterBy = filterBy;
computed.uniq = uniq;

if (isEnabled('ember-runtime-computed-uniq-by')) {
  computed.uniqBy = uniqBy;
}
computed.union = union;
computed.intersect = intersect;
computed.collect = collect;

/**
 Defines the hash of localized strings for the current language. Used by
 the `Ember.String.loc()` helper. To localize, add string values to this
 hash.

 @property STRINGS
 @for Ember
 @type Object
 @private
 */
Object.defineProperty(Ember, 'STRINGS', {
  configurable: false,
  get: getStrings,
  set: setStrings
});

/**
 Whether searching on the global for new Namespace instances is enabled.

 This is only exported here as to not break any addons.  Given the new
 visit API, you will have issues if you treat this as a indicator of
 booted.

 Internally this is only exposing a flag in Namespace.

 @property BOOTED
 @for Ember
 @type Boolean
 @private
 */
Object.defineProperty(Ember, 'BOOTED', {
  configurable: false,
  enumerable: false,
  get: isNamespaceSearchDisabled,
  set: setNamespaceSearchDisabled
});

import {
  Component,
  Helper,
  helper,
  Checkbox,
  TextField,
  TextArea,
  LinkComponent,
  htmlSafe,
  template,
  escapeExpression,
  isHTMLSafe,
  makeBoundHelper,
  getTemplates,
  setTemplates,
  _getSafeString,
  _Renderer
} from 'ember-glimmer';

Ember.Component = Component;
Helper.helper = helper;
Ember.Helper = Helper;
Ember.Checkbox = Checkbox;
Ember.TextField = TextField;
Ember.TextArea = TextArea;
Ember.LinkComponent = LinkComponent;
Ember._Renderer = _Renderer;

if (ENV.EXTEND_PROTOTYPES.String) {
  String.prototype.htmlSafe = function() {
    return htmlSafe(this);
  };
}

let EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};
let EmberHTMLBars = Ember.HTMLBars = Ember.HTMLBars || {};
let EmberHandleBarsUtils = EmberHandlebars.Utils = EmberHandlebars.Utils || {};

Object.defineProperty(EmberHandlebars, 'SafeString', {
  get: _getSafeString
});

EmberHTMLBars.template = EmberHandlebars.template = template;
EmberHandleBarsUtils.escapeExpression = escapeExpression;
EmberString.htmlSafe = htmlSafe;

if (isEnabled('ember-string-ishtmlsafe')) {
  EmberString.isHTMLSafe = isHTMLSafe;
}
EmberHTMLBars.makeBoundHelper = makeBoundHelper;

/**
 Global hash of shared templates. This will automatically be populated
 by the build tools so that you can store your Handlebars templates in
 separate files that get loaded into JavaScript at buildtime.

 @property TEMPLATES
 @for Ember
 @type Object
 @private
 */
Object.defineProperty(Ember, 'TEMPLATES', {
  get: getTemplates,
  set: setTemplates,
  configurable: false,
  enumerable: false
});

// require the main entry points for each of these packages
// this is so that the global exports occur properly
import 'ember-views';
import 'ember-routing';
import 'ember-application';
import 'ember-extension-support';

if (has('ember-template-compiler')) {
  require('ember-template-compiler');
}

// do this to ensure that Ember.Test is defined properly on the global
// if it is present.
if (has('ember-testing')) {
  require('ember-testing');
}

runLoadHooks('Ember');

/**
@module ember
*/
export default Ember;
