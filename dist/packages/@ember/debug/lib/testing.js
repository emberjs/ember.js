let testing = false;
export function isTesting() {
  return testing;
}
export function setTesting(value) {
  testing = Boolean(value);
}