/**
Ember Extension Support

@module ember
@submodule ember-extension-support
@requires ember-application
*/

import Ember from "ember-metal/core";
import DataAdapter from "ember-extension-support/data_adapter";
import ContainerDebugAdapter from "ember-extension-support/container_debug_adapter";

Ember.DataAdapter = DataAdapter;
Ember.ContainerDebugAdapter = ContainerDebugAdapter;
