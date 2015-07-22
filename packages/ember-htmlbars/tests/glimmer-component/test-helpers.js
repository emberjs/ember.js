export function moduleForGlimmerComponent(name, options) {
  function beforeEach() {
  }

  function afterEach() {
  }

  QUnit.module(`Glimmer Component - ${name}`, { beforeEach, afterEach });
}
