const Babel = require('broccoli-babel-transpiler');

module.exports = function(tree) {
  let options = {
    sourceMaps: true,
    plugins: [
      ['@babel/plugin-transform-async-to-generator'],
      ['@babel/plugin-transform-regenerator'],
    ],
  };

  return new Babel(tree, options);
};
