import assign from 'ember-metal/assign';
import EmptyObject from 'ember-metal/empty_object';

/**
@module ember
@submodule ember-routing-views
*/

class OutletStateReference {
  constructor(outletView) {
    this.outletView = outletView;
    this.children = new EmptyObject();
  }

  get(key) {
    return new ChildOutletStateReference(this, key);
  }

  value() {
    return this.outletView.outletState;
  }

  get isTopLevel() {
    return true;
  }

  isDirty() {
    return true;
  }

  destroy() {
  }
}

class ChildOutletStateReference {
  constructor(parent, key) {
    this.parent = parent;
    this.key = key;
    this.children = new EmptyObject();
  }

  get(key) {
    return new ChildOutletStateReference(this, key);
  }

  value() {
    return this.parent.value().outlets[this.key];
  }

  get isTopLevel() {
    return false;
  }

  isDirty() {
    return true;
  }

  destroy() {
  }
}

export class OutletView {
  static extend(injections) {
    return class extends OutletView {
      static create(options) {
        if (options) {
          return super.create(assign({}, injections, options));
        } else {
          return super.create(injections);
        }
      }
    };
  }

  static reopenClass(injections) {
    assign(this, injections);
  }

  static create({ _environment, renderer, template }) {
    return new OutletView(_environment, renderer, template);
  }

  constructor(_environment, renderer, template) {
    this._environment = _environment;
    this.renderer = renderer;
    this.template = template;
    this.outletState = null;
    this._renderResult = null;
  }

  appendTo(selector) {
    let { _environment: { options: { jQuery } } } = this;

    if (jQuery) {
      this._renderResult = this.renderer.appendOutletView(this, jQuery(selector)[0]);
    } else {
      this._renderResult = this.renderer.appendOutletView(this, selector);
    }
  }

  appendChild() { }

  rerender() {
    if (this._renderResult) { this.renderer.rerender(this); }
  }

  setOutletState(state) {
    this.outletState = state;
    this.rerender(); // FIXME
  }

  toReference() {
    return new OutletStateReference(this);
  }

  destroy() {
    this._renderResult.destroy();
  }
}
