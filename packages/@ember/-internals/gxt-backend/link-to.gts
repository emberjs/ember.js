/**
 * GXT-compatible LinkTo component
 *
 * This is a simplified version of Ember's LinkTo that works with GXT.
 * It renders an anchor tag that triggers route transitions.
 */
import { Component } from '@lifeart/gxt';

export class LinkTo extends Component {
  get route() {
    return this.args.route || '';
  }

  get model() {
    return this.args.model;
  }

  get models() {
    return this.args.models || [];
  }

  get query() {
    return this.args.query || {};
  }

  get href() {
    // Build href from route name
    // For now, just use hash-based routing
    const route = this.route;
    if (!route) return '#';

    let href = `#/${route.split('.').join('/')}`;

    // Add model(s) to URL if present
    if (this.model) {
      href += `/${this.model}`;
    } else if (this.models.length > 0) {
      href += '/' + this.models.join('/');
    }

    // Add query params if present
    const queryEntries = Object.entries(this.query);
    if (queryEntries.length > 0) {
      href += '?' + queryEntries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    }

    return href;
  }

  handleClick = (event?: MouseEvent | Event) => {
    // Guard against undefined event (can happen in some GXT rendering scenarios)
    if (!event) {
      return;
    }

    // If the click is modified (ctrl/cmd/shift), let the browser handle it
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.ctrlKey || mouseEvent.metaKey || mouseEvent.shiftKey || mouseEvent.altKey) {
      return;
    }

    // If there's a real router, use it
    const owner = (globalThis as any).owner;
    if (owner) {
      const router = owner.lookup('service:router') || owner.lookup('router:main');
      if (router && typeof router.transitionTo === 'function') {
        event.preventDefault?.();

        const args: any[] = [this.route];
        if (this.model) {
          args.push(this.model);
        } else if (this.models.length > 0) {
          args.push(...this.models);
        }
        if (Object.keys(this.query).length > 0) {
          args.push({ queryParams: this.query });
        }

        router.transitionTo(...args);
        return;
      }
    }

    // Otherwise, let the default anchor behavior happen (hash navigation)
  };

  <template>
    <a href={{this.href}} onclick={{this.handleClick}} ...attributes>{{yield}}</a>
  </template>
}

export default LinkTo;
