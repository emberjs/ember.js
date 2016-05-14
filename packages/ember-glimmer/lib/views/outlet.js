import assign from 'ember-metal/assign';
import { DirtyableTag } from 'glimmer-reference';

/**
@module ember
@submodule ember-templates
*/

class OutletStateReference {
  constructor(outletView) {
    this.outletView = outletView;
    this.tag = outletView._tag;
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
}

class ChildOutletStateReference {
  constructor(parent, key) {
    this.parent = parent;
    this.key = key;
    this.tag = parent.tag;
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
}

export default class OutletView {
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
    this._tag = new DirtyableTag();
  }

  appendTo(selector) {
    let { _environment: { options: { jQuery } } } = this;

    if (jQuery) {
      this._renderResult = this.renderer.appendOutletView(this, jQuery(selector)[0]);
    } else {
      this._renderResult = this.renderer.appendOutletView(this, selector);
    }
  }

  appendChild(instance) {
    instance.parentView = this;
    instance.ownerView = this;
  }

  rerender() {
    if (this._renderResult) { this.renderer.rerender(this); }
  }

  setOutletState(state) {
    this.outletState = state;
    this._tag.dirty();
    this.rerender(); // FIXME
  }

  toReference() {
    return new OutletStateReference(this);
  }

  destroy() {
    this._renderResult.destroy();
  }
}
