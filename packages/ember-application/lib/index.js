import Ember from 'ember-metal/core';
import { runLoadHooks } from 'ember-runtime/system/lazy_load';

/**
@module ember
@submodule ember-application
*/

import DefaultResolver from 'ember-application/system/resolver';
import {
  Resolver
} from 'ember-application/system/resolver';
import Application from 'ember-application/system/application';

Ember.Application = Application;
Ember.Resolver = Resolver;
Ember.DefaultResolver = DefaultResolver;


runLoadHooks('Ember.Application', Application);
