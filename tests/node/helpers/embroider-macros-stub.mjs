// Stub for @embroider/macros when running dist packages directly in Node.js.
// In a real Ember app build (via Embroider/webpack), these functions are
// replaced at compile time by babel-plugin-debug-macros. We return true here
// to get debug-mode behavior in the test environment.
export function isDevelopingApp() {
  return true;
}
export function isTesting() {
  return true;
}
export function macroCondition(predicate) {
  return predicate;
}
export function dependencySatisfies() {
  return false;
}
export function getConfig() {
  return {};
}
export function getOwnConfig() {
  return {};
}
export function getGlobalConfig() {
  return {};
}
export function importSync(specifier) {
  // eslint-disable-next-line no-undef
  return require(specifier);
}
export function moduleExists() {
  return false;
}
