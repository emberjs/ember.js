import Controller from '@ember/controller';
import { set } from '@ember/object';

// Deliberately decorator-free (classic `set` instead of `@tracked` +
// `@action`) so the template app needs no babel transform at all — the
// only build-time machinery is the ember-source resolver in vite.config.mjs.
export default class ApplicationController extends Controller {
  count = 0;

  increment = () => {
    set(this, 'count', this.count + 1);
  };
}
