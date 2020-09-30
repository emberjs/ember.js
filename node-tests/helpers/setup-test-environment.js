const { setEdition, clearEdition } = require('@ember/edition-utils');

function enableOctane() {
  beforeEach(function () {
    setEdition('octane');
  });

  afterEach(function () {
    clearEdition();
  });
}

module.exports = {
  enableOctane,
};
