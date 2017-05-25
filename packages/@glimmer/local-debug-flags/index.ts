let location = typeof window !== undefined && window.location;
let DEBUG = false;
if (location && /[?&]glimmer_logging/.test(window.location.search) {
  DEBUG = true;
}

export const DEBUG = DEBUG;

// TODO this is hacky but requires unifying the build
export const CI = !!window['Testem'];
