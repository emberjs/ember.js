export class Renderer {
  constructor(domHelper, { destinedForDOM, env } = {}) {
    this._dom = domHelper;
    this._env = env;
  }

  appendTo(view, target) {
    let env = this._env;

    env.begin();
    view.template.render({ view }, env, { appendTo: target });
    env.commit();
  }

  componentInitAttrs() {
    // TODO: Remove me
  }
}
