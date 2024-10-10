import Ember from '../ember';

const require = function (id) {
  try {
    return Ember.__loader.require(id);
  } catch (e) {
    return requireModule(id);
  }
};

export function emberSafeRequire(id) {
  try {
    return require(id);
  } catch (e) {
    return undefined;
  }
}

export let EmberLoader = {
  require,
  requireModule: require,
};
