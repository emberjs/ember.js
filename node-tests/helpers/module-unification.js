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
};
