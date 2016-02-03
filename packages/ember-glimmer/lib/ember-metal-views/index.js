import { RootReference } from '../environment';

export class Renderer {
  constructor(domHelper, { destinedForDOM, env } = {}) {
    this._dom = domHelper;
    this._env = env;
  }

  appendTo(view, target) {
    let env = this._env;
    let self = new RootReference(view);

    env.begin();
    let result = view.template.render(self, env, { appendTo: target });
    env.commit();

    // FIXME: Store this somewhere else
    view['_renderResult'] = result;

    // FIXME: This should happen inside `env.commit()`
    view._transitionTo('inDOM');
  }

  rerender(view) {
    view['_renderResult'].rerender();
  }

  remove(view) {
    view._transitionTo('destroying');
    view.destroy();
  }

  componentInitAttrs() {
    // TODO: Remove me
  }

  ensureViewNotRendering() {
    // TODO: Implement this
    // throw new Error('Something you did caused a view to re-render after it rendered but before it was inserted into the DOM.');
  }
}
