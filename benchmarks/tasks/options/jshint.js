module.exports = {
  options: {
    'jshintrc': '.jshintrc'
  },
  output: {
    src: ['dist/<%= pkg.name %>-<%= pkg.version %>.js']
  }
};
