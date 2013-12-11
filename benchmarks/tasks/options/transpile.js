function nameFor(path) {
  var result,  match;
  if (match = path.match(/^(?:lib|suites|test|test\/tests)\/(.*?)(?:\.js)?$/)) {
    result = match[1];
  } else {
    result = path;
  }

  return path;
}

module.exports = {
  amd: {
    moduleName: nameFor,
    type: 'amd',
    files: [{
      expand: true,
      cwd: 'lib/',
      src: ['**/*.js'],
      dest: 'tmp/amd/',
      ext: '.js'
    }]
  },

  commondjs: {
    moduleName: nameFor,
    type: 'cjs',
    files: [{
      expand: true,
      cwd: 'lib/',
      src: ['**/*.js'],
      dest: 'tmp/commonjs/',
      ext: '.js'
    }]
  }
};
