import { setDispatchOverride } from 'ember-error-handling';

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

  console.error(error.stack); // eslint-disable-line no-console
}
