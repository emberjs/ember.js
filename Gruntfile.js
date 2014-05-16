module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-broccoli');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadTasks('tasks');

  grunt.registerTask('server', 'broccoli:browser:serve');
  grunt.registerTask('dist', ['clean', 'broccoli:dist:build']);
  grunt.registerTask('test', ['clean:tmp', 'broccoli:browser:build', 'qunit:all']);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    broccoli: {
      dist: {
        config: 'tasks/build/dist.js',
        dest: 'dist'
      },
      browser: {
        config: 'tasks/build/browser.js',
        dest: 'tmp/test'
      }
    },

    clean: {
      dist: 'dist',
      tmp: 'tmp'
    },

    qunit: {
      all: ['tmp/test/index.html']
    }
  });
};
