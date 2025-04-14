// required for inspector
import { isTesting } from './lib/testing';
import { _backburner, cancel, debounce, join, later, scheduleOnce } from '@ember/runloop';
import { cacheFor, guidFor } from '@ember/object/internals';
import { default as MutableArray } from '@ember/array/mutable';
import { default as Namespace } from '@ember/application/namespace';
import { default as MutableEnumerable } from '@ember/enumerable/mutable';
import { NativeArray } from '@ember/array';
import { ControllerMixin } from '@ember/controller';
import { default as CoreObject } from '@ember/object/core';
import { default as Application } from '@ember/application';
import { default as EmberComponent } from '@ember/component';
import { default as Observable } from '@ember/object/observable';
import { default as Evented } from '@ember/object/evented';
import { default as PromiseProxyMixin } from '@ember/object/promise-proxy-mixin';
import { default as EmberObject } from '@ember/object';
import { default as VERSION } from 'ember/version';
import {
  ComputedProperty,
  isComputed,
  descriptorForProperty,
  descriptorForDecorator,
  tagForProperty,
  libraries,
} from '@ember/-internals/metal';
import { isMandatorySetter } from '@ember/-internals/utils';
import { meta } from '@ember/-internals/meta';
import { ActionHandler, TargetActionSupport } from '@ember/-internals/runtime';
import {
  ViewStateSupport,
  ViewMixin,
  ActionSupport,
  ClassNamesSupport,
  ChildViewsSupport,
  CoreView,
} from '@ember/-internals/views';
import { set, get } from '@ember/object';
import { isTrackedProperty } from '@ember/-internals/metal';
import { isCachedProperty } from '@ember/-internals/metal';
import { default as inspect } from './lib/inspect';
import { subscribe } from '../instrumentation';
import { default as captureRenderTree } from './lib/capture-render-tree';
import { registerHandler as registerDeprecationHandler } from './lib/deprecate';
import * as GlimmerValidator from '@glimmer/validator';
import * as GlimmerRuntime from '@glimmer/runtime';
import { getOwner } from '@ember/owner';
import RSVP from 'rsvp';
import Service from '@ember/service';
import { ENV } from '@ember/-internals/environment';

export function setupInspectorSupport() {
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener(
      'ember-inspector-debug-request',
      () => {
        const event = new CustomEvent('ember-inspector-debug-response', {
          detail: {
            utils: {
              libraries,
            },
            runloop: {
              _backburner,
              cancel,
              debounce,
              join,
              later,
              scheduleOnce,
            },
            object: {
              cacheFor,
              guidFor,
              getOwner,
              set,
              get,
            },
            debug: {
              isComputed,
              isTrackedProperty,
              isCachedProperty,
              descriptorForProperty,
              descriptorForDecorator,
              isMandatorySetter,
              meta,
              captureRenderTree,
              isTesting,
              inspect,
              registerDeprecationHandler,
              tagForProperty,
            },
            classes: {
              ActionHandler,
              Service,
              ComputedProperty,
              EmberObject,
              MutableArray,
              Namespace,
              MutableEnumerable,
              NativeArray,
              TargetActionSupport,
              ControllerMixin,
              CoreObject,
              Application,
              EmberComponent,
              Observable,
              Evented,
              PromiseProxyMixin,
              RSVP,
            },
            VERSION,
            ENV,
            instrumentation: {
              subscribe,
            },
            Views: {
              ViewStateSupport,
              ViewMixin,
              ActionSupport,
              ClassNamesSupport,
              ChildViewsSupport,
              CoreView,
            },
            glimmer: {
              runtime: GlimmerRuntime,
              validator: GlimmerValidator,
            },
          },
        });
        window.dispatchEvent(event);
      },
      false
    );
  }
}
