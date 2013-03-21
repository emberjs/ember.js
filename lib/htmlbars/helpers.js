var helpers = {};

function registerHelper(name, callback) {
  helpers[name] = callback;
}

function removeHelper(name) {
  delete helpers[name];
}

export { registerHelper, removeHelper, helpers };