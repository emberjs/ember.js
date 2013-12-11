module.exports = function(grunt) {
  var fs = require('fs');
  require('load-grunt-tasks')(grunt);
  var config = require('load-grunt-config')(grunt, {
    configPath: 'tasks/options',
    init: false
  });

  grunt.loadTasks('tasks');

  config.env = process.env;
  config.pkg = grunt.file.readJSON('package.json');

  grunt.registerTask('createConfig', function() {
    var path = config.pkg.directories.implementations,
        configPath = config.pkg.config,
        data = [],
        files = fs.readdirSync('./' + path);

    data = [
            'var logToConsole = ' + config.pkg.logToConsole + ',\r\n',
            '\t\timplementations = "' + files + '";\r\n',
            'export { logToConsole, implementations };'
           ];

    fs.writeFileSync(configPath, data.join(''));
  });

  this.registerTask('default', ['build']);
  this.registerTask('server', ['build', 'connect', 'watch']);
  this.registerTask('build', ['clean', 'createConfig', 'transpile', 'concat:browser']);

  grunt.initConfig(config);
};
