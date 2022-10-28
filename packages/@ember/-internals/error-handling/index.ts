let onerror: Function | undefined;
export const onErrorTarget = {
  get onerror() {
    return onerror;
  },
};

// Ember.onerror getter
export function getOnerror() {
  return onerror;
}
// Ember.onerror setter
export function setOnerror(handler: Function | undefined) {
  onerror = handler;
}

let dispatchOverride: Function | null = null;

// allows testing adapter to override dispatch
export function getDispatchOverride() {
  return dispatchOverride;
}
export function setDispatchOverride(handler: Function | null) {
  dispatchOverride = handler;
}
