export default class BaseObject {
  isDestroyed = false;
  constructor(data) {
    Object.assign(this, data || {});
    this.init();
  }

  init() {}
  willDestroy() {
    this.isDestroying = true;
  }

  destroy() {
    this.willDestroy();
    this.isDestroyed = true;
  }

  reopen(data) {
    Object.assign(this, data);
  }
}
