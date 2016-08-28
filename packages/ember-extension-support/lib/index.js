/**
@module ember
@submodule ember-extension-support
*/

import Ember from 'ember-metal/core'; // reexports
import DataAdapter from './data_adapter';
import ContainerDebugAdapter from './container_debug_adapter';

Ember.DataAdapter = DataAdapter;
Ember.ContainerDebugAdapter = ContainerDebugAdapter;
