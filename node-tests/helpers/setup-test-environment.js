const { setEdition, clearEdition } = require('@ember/edition-utils');

function enableOctane() {
  beforeEach(function() {
    setEdition('octane');
  });

  afterEach(function() {
    clearEdition();
  });
}

function enableModuleUnification() {
  beforeEach(function() {
    process.env.EMBER_CLI_MODULE_UNIFICATION = 'true';
  });

  afterEach(function() {
    delete process.env.EMBER_CLI_MODULE_UNIFICATION;
  });
}

module.exports = {
  enableModuleUnification,
  enableOctane,
};
