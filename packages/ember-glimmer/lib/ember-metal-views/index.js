import { RootReference } from '../utils/references';

export class Renderer {
  constructor(domHelper, { destinedForDOM, env } = {}) {
    this._dom = domHelper;
    this._env = env;
  }

  appendTo(view, target) {
    let env = this._env;
    let self = new RootReference(view);
    let viewRef = new RootReference(view);

    env.begin();
    let result = view.template.asEntryPoint().render(self, env, { appendTo: target, keywords: { view: viewRef } });
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
    view['_renderResult'].destroy();
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
