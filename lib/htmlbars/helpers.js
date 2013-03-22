var helpers = {};

export function registerHelper(name, callback) {
  helpers[name] = callback;
}

export function removeHelper(name) {
  delete helpers[name];
}

export { helpers };