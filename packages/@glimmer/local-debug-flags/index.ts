export const DEBUG = (() => {
  let location = typeof window !== undefined && window.location;
  if (location && /[?&]glimmer_logging/.test(window.location.search)) {
    return true;
  }
  return false;
})();

// TODO this is hacky but requires unifying the build
export const CI = !!window['Testem'];
