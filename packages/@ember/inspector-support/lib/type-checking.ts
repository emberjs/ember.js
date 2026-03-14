import EmberObject from '@ember/object';
import CoreObject from '@ember/object/core';
import Observable from '@ember/object/observable';
import Evented from '@ember/object/evented';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import { ControllerMixin } from '@ember/controller';
import MutableArray from '@ember/array/mutable';
import MutableEnumerable from '@ember/enumerable/mutable';
import { NativeArray } from '@ember/array';
import ObjectProxy from '@ember/object/proxy';
import ArrayProxy from '@ember/array/proxy';
import Service from '@ember/service';
import Component from '@ember/component';
import Application from '@ember/application';
import Namespace from '@ember/application/namespace';
import GlimmerComponent from '@glimmer/component/src/-private/component';

function safeInstanceOf(obj: unknown, klass: { new (...args: any[]): any } | null): boolean {
  if (obj === null || obj === undefined || klass === null) return false;
  try {
    return obj instanceof klass;
  } catch {
    return false;
  }
}

function safeMixinCheck(
  obj: unknown,
  mixin: { detect?: (obj: unknown) => boolean } | null
): boolean {
  if (obj === null || obj === undefined || mixin === null) return false;
  try {
    if (typeof mixin.detect === 'function') {
      return mixin.detect(obj);
    }
    return false;
  } catch {
    return false;
  }
}

export const typeChecking = {
  /**
   * Check if an object is an instance of EmberObject.
   */
  isEmberObject(obj: unknown): boolean {
    return safeInstanceOf(obj, EmberObject);
  },

  /**
   * Check if an object is an instance of Ember's classic Component.
   */
  isComponent(obj: unknown): boolean {
    return safeInstanceOf(obj, Component);
  },

  /**
   * Check if an object is an instance of Glimmer Component.
   */
  isGlimmerComponent(obj: unknown): boolean {
    return safeInstanceOf(obj, GlimmerComponent);
  },

  /**
   * Check if an object is an instance of Ember Service.
   */
  isService(obj: unknown): boolean {
    return safeInstanceOf(obj, Service);
  },

  /**
   * Check if an object is an instance of ObjectProxy.
   */
  isObjectProxy(obj: unknown): boolean {
    return safeInstanceOf(obj, ObjectProxy);
  },

  /**
   * Check if an object is an instance of ArrayProxy.
   */
  isArrayProxy(obj: unknown): boolean {
    return safeInstanceOf(obj, ArrayProxy);
  },

  /**
   * Check if an object is an instance of CoreObject.
   */
  isCoreObject(obj: unknown): boolean {
    return safeInstanceOf(obj, CoreObject);
  },

  /**
   * Check if an object is an instance of Ember Application.
   */
  isApplication(obj: unknown): boolean {
    return safeInstanceOf(obj, Application);
  },

  /**
   * Check if an object is an instance of Ember Namespace.
   */
  isNamespace(obj: unknown): boolean {
    return safeInstanceOf(obj, Namespace);
  },

  /**
   * Check if an object has the Observable mixin applied.
   */
  hasObservable(obj: unknown): boolean {
    return safeMixinCheck(obj, Observable);
  },

  /**
   * Check if an object has the Evented mixin applied.
   */
  hasEvented(obj: unknown): boolean {
    return safeMixinCheck(obj, Evented);
  },

  /**
   * Check if an object has the PromiseProxyMixin applied.
   */
  hasPromiseProxyMixin(obj: unknown): boolean {
    return safeMixinCheck(obj, PromiseProxyMixin);
  },

  /**
   * Check if an object has the ControllerMixin applied.
   */
  hasControllerMixin(obj: unknown): boolean {
    return safeMixinCheck(obj, ControllerMixin);
  },

  /**
   * Check if an object implements MutableArray.
   */
  isMutableArray(obj: unknown): boolean {
    return safeMixinCheck(obj, MutableArray);
  },

  /**
   * Check if an object implements MutableEnumerable.
   */
  isMutableEnumerable(obj: unknown): boolean {
    return safeMixinCheck(obj, MutableEnumerable);
  },

  /**
   * Check if an object is a NativeArray.
   */
  isNativeArray(obj: unknown): boolean {
    return safeMixinCheck(obj, NativeArray);
  },
};
