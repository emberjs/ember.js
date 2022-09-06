/**
  @module
  Makes Ember's types for the packages it publishes available by importing this
  path from `ember-source`:

  ```ts
  import 'ember-source/preview';
  ```
 */

// This works because each of these modules presents `declare module` definition
// of the module and *only* that, so importing this file in turn makes those
// module declarations "visible" automatically throughout a consuming project.
// Combined with use of `typesVersions` (or, in the future, possibly `exports`)
// in `package.json`, this allows users to import the types without knowing the
// exact layout details.
//
// Somewhat annoyingly, every single module in the graph must appear here. For
// now, while we are publishing ambient types, that means we must maintain this
// by hand. When we start emitting types from the source, we will need to do the
// same work, but automatically.

import './ember';
import './ember/-private/type-utils';

import './@ember/-internals/resolver';

import './@ember/application';
import './@ember/application/-private/event-dispatcher';
import './@ember/application/-private/registry';
import './@ember/application/deprecations';
import './@ember/application/instance';
import './@ember/application/types';

import './@ember/array';
import './@ember/array/-private/enumerable';
import './@ember/array/-private/mutable-enumerable';
import './@ember/array/-private/native-array';
import './@ember/array/mutable';
import './@ember/array/proxy';

import './@ember/component';
import './@ember/component/-private/class-names-support';
import './@ember/component/-private/core-view';
import './@ember/component/-private/glimmer-interfaces';
import './@ember/component/-private/signature-utils';
import './@ember/component/-private/view-mixin';
import './@ember/component/helper';
import './@ember/component/template-only';

import './@ember/controller';

import './@ember/debug';
import './@ember/debug/container-debug-adapter';
import './@ember/debug/data-adapter';

import './@ember/destroyable';

import './@ember/engine';
import './@ember/engine/-private/container-proxy-mixin';
import './@ember/engine/-private/registry-proxy-mixin';
import './@ember/engine/-private/types/initializer';
import './@ember/engine/instance';

import './@ember/error';

import './@ember/helper';

import './@ember/modifier';

import './@ember/object';
import './@ember/object/-private/action-handler';
import './@ember/object/-private/types';
import './@ember/object/compat';
import './@ember/object/computed';
import './@ember/object/core';
import './@ember/object/evented';
import './@ember/object/events';
import './@ember/object/internals';
import './@ember/object/mixin';
import './@ember/object/observable';
import './@ember/object/observers';
import './@ember/object/promise-proxy-mixin';
import './@ember/object/proxy';

import './@ember/owner';

import './@ember/polyfills';
import './@ember/polyfills/types';

import './@ember/routing';
import './@ember/routing/-private/router-dsl';
import './@ember/routing/auto-location';
import './@ember/routing/hash-location';
import './@ember/routing/history-location';
import './@ember/routing/none-location';
import './@ember/routing/route';
import './@ember/routing/route-info';
import './@ember/routing/router';
import './@ember/routing/router-service';
import './@ember/routing/transition';
import './@ember/routing/types';

import './@ember/runloop';
import './@ember/runloop/-private/backburner';
import './@ember/runloop/-private/types';
import './@ember/runloop/types';

import './@ember/service';

import './@ember/string';

import './@ember/template';
import './@ember/template/-private/handlebars';

import './@ember/test';
import './@ember/test/adapter';

import './@ember/utils';
import './@ember/utils/-private/types';
