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

  // A bound URL that `<ForwardedLink>` (a build-time-compiled .gjs) forwards
  // to its <a> through `...attributes`: rendered sanitized (`unsafe:` prefix),
  // as Glimmer does.
  linkUrl = 'javascript:alert(1)';

  swapLink = () => {
    set(this, 'linkUrl', 'vbscript:alert(1)');
  };

  // The `{{on "click"}}` that `<ForwardedLink>` forwards to its <a>.
  linkClicks = 0;

  followLink = (event) => {
    event.preventDefault();
    set(this, 'linkClicks', this.linkClicks + 1);
  };
}
