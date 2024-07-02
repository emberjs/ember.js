import type Service from '@ember/service';
import type Controller from '@ember/controller';
import type Route from '@ember/routing/route';
import type GlimmerComponent from '@glimmer/component';
import type Helper from '@ember/component/helper';
import type Modifier from 'ember-modifier';
import type { PrecompiledTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import env from '@/config/env';
export type RegisteredComponent = typeof GlimmerComponent & {
  template: PrecompiledTemplate;
};
export type RegistryType =
  | 'service'
  | 'controller'
  | 'route'
  | 'template'
  | 'component'
  | 'helper'
  | 'modifier';
export type RegistryKey = `${RegistryType}:${string}`;
export interface IRegistry {
  [key: RegistryKey]:
    | typeof Service
    | typeof Controller
    | typeof Route
    | typeof Helper
    | Modifier
    | RegisteredComponent
    | PrecompiledTemplate;
}

export function registerComponent<T>(
  component: T & { template: PrecompiledTemplate }
): RegisteredComponent {
  try {
    return setComponentTemplate(
      component.template,
      component as unknown as object
    ) as RegisteredComponent;
  } catch (e) {
    console.error(e);
    return component as unknown as RegisteredComponent;
  }
}

export function resoleFromRegistry<T>(key: RegistryKey): T {
  // application.__registry__.resolve
  return window[env.APP.globalName].resolveRegistration(key) as T;
}

export function extendRegistry(registry) {
  Object.keys(registry).forEach((key) => {
    try {
      window[env.APP.globalName].register(key, registry[key]);
    } catch(e) {
      // hot-reload case
      window[env.APP.globalName].unregister(key);
      window[env.APP.globalName].register(key, registry[key]);
    }
  });
}
