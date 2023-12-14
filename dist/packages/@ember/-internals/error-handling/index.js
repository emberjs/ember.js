let onerror;
export const onErrorTarget = {
  get onerror() {
    return onerror;
  }
};
// Ember.onerror getter
export function getOnerror() {
  return onerror;
}
// Ember.onerror setter
export function setOnerror(handler) {
  onerror = handler;
}
let dispatchOverride = null;
// allows testing adapter to override dispatch
export function getDispatchOverride() {
  return dispatchOverride;
}
export function setDispatchOverride(handler) {
  dispatchOverride = handler;
}