let vmBabelPlugins = require('../../../index');

module.exports = {
  plugins: [
    ...vmBabelPlugins({ isDebug: true })
  ]
}
