/**
@module ember
@submodule ember-extension-support
*/

import Ember from 'ember-metal/core';
import DataAdapter from 'ember-extension-support/data_adapter';
import ContainerDebugAdapter from 'ember-extension-support/container_debug_adapter';
import { getTopLevelNode } from 'ember-extension-support/render_debug';

Ember.DataAdapter = DataAdapter;
Ember.ContainerDebugAdapter = ContainerDebugAdapter;
Ember.Debug = Ember.Debug || {};
Ember.Debug.RenderDebug = { getTopLevelNode };
