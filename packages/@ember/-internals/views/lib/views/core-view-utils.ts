import { hasListeners, sendEvent } from '@ember/-internals/metal';
import type CoreView from './core_view';

export function sendCoreViewEvent(view: CoreView, name: string, args: any[] = []) {
  sendEvent(view, name, args);
  let method = (view as any)[name];
  if (typeof method === 'function') {
    return method.apply(view, args);
  }
}

export function hasCoreViewListener(view: CoreView, name: string) {
  return typeof (view as any)[name] === 'function' || hasListeners(view, name);
}
