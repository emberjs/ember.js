import { setDispatchOverride } from '@ember/-internals/error-handling';
let adapter;
export function getAdapter() {
  return adapter;
}
export function setAdapter(value) {
  adapter = value;
  if (value && typeof value.exception === 'function') {
    setDispatchOverride(adapterDispatch);
  } else {
    setDispatchOverride(null);
  }
}
export function asyncStart() {
  if (adapter) {
    adapter.asyncStart();
  }
}
export function asyncEnd() {
  if (adapter) {
    adapter.asyncEnd();
  }
}
function adapterDispatch(error) {
  adapter.exception(error);
  // @ts-expect-error Normally unreachable
  console.error(error.stack); // eslint-disable-line no-console
}