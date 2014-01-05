module.exports = function(grunt) {
  // Alias tasks for the most common sets of tasks.
  // Most of the time, you will use these.

  // By default, (i.e., if you invoke `grunt` without arguments), do
  // a new build.
  this.registerTask('default', ['test']);

  this.registerTask('dist', "Builds a distributable version of htmlbars",
                    ['jshint',
                     'build',
                     'concat_sourcemap:library',
                     'concat_sourcemap:browser',
                     'fix_sourcemap:library',
                     'fix_sourcemap:browser',
                     'copy:sources',
                     'uglify:library',
                     'uglify:browser',
                     'bytes'
                    ]);

  // Build a new version of the library
  this.registerTask('build', "Builds a htmlbars",
                    ['clean',
                     'transpile:amd',
                     'concat_sourcemap:amd',
                     'fix_sourcemap:amd'
                    ]);

  this.registerTask('tests', "Builds the test package",
                    ['build',
                     'transpile:tests',
                     'concat_sourcemap:tests',
                     'fix_sourcemap:tests'
                    ]);

  // Run a server. This is ideal for running the QUnit tests in the browser.
  this.registerTask('server', ['tests', 'connect', 'watch']);

  this.registerTask('test', ['jshint', 'tests', 'qunit']);


  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    connect: {
      server: {},

      options: {
        hostname: '0.0.0.0',
        port: grunt.option('port') || 8000,
        base: '.'
      }
    },

    watch: {
      files: ['lib/**', 'vendor/*', 'test/**/*'],
      tasks: ['tests', 'jshint']
    },

    transpile: {
      amd: {
        type: "amd",
        moduleName: function (moduleName) {
          moduleName = moduleName.replace(/^vendor\//, '');
          return moduleName;
        },
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['**/*.js'],
          dest: 'tmp/'
        }]
      },

      tests: {
        type: 'amd',
        files: [{
          expand: true,
          cwd: 'test/',
          src: ['test_helpers.js', 'tests.js', 'tests/**/*_test.js'],
          dest: 'tmp/'
        }]
      }
    },

    concat_sourcemap: {
      amd: {
        files: [{
          src: ['tmp/htmlbars.js', 'tmp/htmlbars/**/*.js', 'tmp/vendor/*.js'],
          dest: 'tmp/htmlbars.amd.js'
        }]
      },
      tests: {
        files: [{
          src: ['tmp/tests/*.js'],
          dest: 'tmp/tests.amd.js'
        }]
      },
      library: {
        src: ['tmp/<%= pkg.name %>.amd.js'],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.amd.js'
      },
      browser: {
        src: [
          'wrap/browser.start',
          'vendor/loader.js',
          'vendor/handlebars.amd.js',
          'tmp/<%= pkg.name %>.amd.js',
          'wrap/browser.end'
        ],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
      }
    },

    fix_sourcemap: {
      amd: {
        files: {
          src: 'tmp/htmlbars.amd.js.map'
        }
      },
      tests: {
        files: {
          src: 'tmp/tests.amd.js.map'
        }
      },
      library: {
        root: 'sources-<%= pkg.version %>',
        files: {
          src: 'dist/<%= pkg.name %>-<%= pkg.version %>.amd.js.map'
        }
      },
      browser: {
        root: 'sources-<%= pkg.version %>',
        files: {
          src: 'dist/<%= pkg.name %>-<%= pkg.version %>.js.map'
        }
      }
    },

    copy: {
      sources: {
        files: [{
          expand: true,
          cwd: 'tmp/',
          src: ['<%= pkg.name %>.js', '<%= pkg.name %>.amd.js', '<%= pkg.name %>.amd.js.map', '<%= pkg.name %>/**/*.js', 'vendor/**/*.js'],
          dest: 'dist/sources-<%= pkg.version %>/'
        }, {
          expand: true,
          src: ['wrap/*', 'vendor/**/*.js'],
          dest: 'dist/sources-<%= pkg.version %>/'
        }]
      }
    },

    uglify: {
      library: {
        options: {
          sourceMapIn: 'dist/<%= pkg.name %>-<%= pkg.version %>.amd.js.map',
          sourceMap: 'dist/<%= pkg.name %>-<%= pkg.version %>.amd.min.js.map',
          sourceMappingURL: '<%= pkg.name %>-<%= pkg.version %>.amd.min.js.map'
        },
        files: {
          'dist/<%= pkg.name %>-<%= pkg.version %>.amd.min.js': ['dist/<%= pkg.name %>-<%= pkg.version %>.amd.js']
        }
      },
      browser: {
        options: {
          sourceMapIn: 'dist/<%= pkg.name %>-<%= pkg.version %>.js.map',
          sourceMap: 'dist/<%= pkg.name %>-<%= pkg.version %>.min.js.map',
          sourceMappingURL: '<%= pkg.name %>-<%= pkg.version %>.min.js.map'
        },
        files: {
          'dist/<%= pkg.name %>-<%= pkg.version %>.min.js': ['dist/<%= pkg.name %>-<%= pkg.version %>.js']
        }
      }
    },

    jshint: {
      library: 'lib/**/*.js',
      options: {
        jshintrc: '.jshintrc'
      }
    },

    clean: ["dist"],

    qunit: {
      all: ['test/index.html']
    }
  });

  // Load tasks from npm
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-es6-module-transpiler');
  grunt.loadNpmTasks('grunt-concat-sourcemap');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Multi-task for wrapping browser version
  this.registerTask('bytes', function() {
    console.log("TODO: Add a bytes-tracking task");
  });

  this.registerMultiTask('fix_sourcemap', "Remove tmp from source paths", function() {
    var root = this.data.root;
    this.files.forEach(function(f) {
      f.src.forEach(function (src) {
        map = JSON.parse(grunt.file.read(src));
        for (var i=0; i<map.sources.length; i++) {
          map.sources[i] = map.sources[i].replace(/tmp\//, '');
          if (root) {
            map.sources[i] = grunt.config.process(root) + '/' + map.sources[i];
          }
        }
        grunt.file.write(src, JSON.stringify(map));
      }, this);
    });
  });
};
