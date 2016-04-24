import Ember from 'ember-metal/core'; // reexports
import isEnabled from 'ember-metal/features';
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
import ApplicationInstance from 'ember-application/system/application-instance';
import Engine from 'ember-application/system/engine';
import EngineInstance from 'ember-application/system/engine-instance';

Ember.Application = Application;
Ember.Resolver = Resolver;
Ember.DefaultResolver = DefaultResolver;

if (isEnabled('ember-application-engines')) {
  Ember.Engine = Engine;

  // Expose `EngineInstance` and `ApplicationInstance` for easy overriding.
  // Reanalyze whether to continue exposing these after feature flag is removed.
  Ember.EngineInstance = EngineInstance;
  Ember.ApplicationInstance = ApplicationInstance;
}

runLoadHooks('Ember.Application', Application);
