export default class BaseObject {
  declare namespace: any;
  isDestroyed = false;
  isDestroying = false;
  constructor(data?: any) {
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

  reopen(data: any) {
    Object.assign(this, data);
  }
}
