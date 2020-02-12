export const LOCAL_DEBUG = (() => {
  let location = typeof window !== 'undefined' && window.location;
  if (location && /[?&]disable_local_debug/.test(window.location.search)) {
    return false;
  }
  return true;
})();

export const LOCAL_SHOULD_LOG = (() => {
  let location = typeof window !== 'undefined' && window.location;
  if (location && /[?&]enable_local_should_log/.test(window.location.search)) {
    return true;
  }
  return false;
})();
