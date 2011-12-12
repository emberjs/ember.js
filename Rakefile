abort "Please use Ruby 1.9 to build Amber.js!" if RUBY_VERSION !~ /^1\.9/

require "bundler/setup"
require "erb"
require "uglifier"

# for now, the SproutCore compiler will be used to compile Ember.js
require "sproutcore"

LICENSE = File.read("generators/license.js")

## Some Ember modules expect an exports object to exist. Mock it out.

module SproutCore
  module Compiler
    class Entry
      def body
        "\n(function(exports) {\n#{@raw_body}\n})({});\n"
      end
    end
  end
end

## HELPERS ##

def strip_require(file)
  result = File.read(file)
  result.gsub!(%r{^\s*require\(['"]([^'"])*['"]\);?\s*}, "")
  result
end

def strip_sc_assert(file)
  result = File.read(file)
  result.gsub!(%r{^(\s)+sc_assert\((.*)\).*$}, "")
  result
end

def uglify(file)
  uglified = Uglifier.compile(File.read(file))
  "#{LICENSE}\n#{uglified}"
end

# Set up the intermediate and output directories for the interim build process

SproutCore::Compiler.intermediate = "tmp/intermediate"
SproutCore::Compiler.output       = "tmp/static"

# Create a compile task for an Ember package. This task will compute
# dependencies and output a single JS file for a package.
def compile_package_task(input, output=input)
  js_tasks = SproutCore::Compiler::Preprocessors::JavaScriptTask.with_input "packages/#{input}/lib/**/*.js", "."
  SproutCore::Compiler::CombineTask.with_tasks js_tasks, "#{SproutCore::Compiler.intermediate}/#{output}"
end

## TASKS ##

# Create ember:package tasks for each of the Ember packages
namespace :ember do
  %w(metal runtime handlebars views states).each do |package|
    task package => compile_package_task("ember-#{package}", "ember-#{package}")
  end
end

# Create a handlebars task
task :handlebars => compile_package_task("handlebars")

# Create a metamorph task
task :metamorph => compile_package_task("metamorph")

# Create a build task that depends on all of the package dependencies
task :build => ["ember:metal", "ember:runtime", "ember:handlebars", "ember:views", "ember:states", :handlebars, :metamorph]

# Strip out require lines from ember.js. For the interim, requires are
# precomputed by the compiler so they are no longer necessary at runtime.
file "dist/ember.js" => :build do
  puts "Generating ember.js"

  mkdir_p "dist"

  File.open("dist/ember.js", "w") do |file|
    file.puts strip_require("tmp/static/handlebars.js")
    file.puts strip_require("tmp/static/ember-metal.js")
    file.puts strip_require("tmp/static/ember-runtime.js")
    file.puts strip_require("tmp/static/ember-views.js")
    file.puts strip_require("tmp/static/ember-states.js")
    file.puts strip_require("tmp/static/metamorph.js")
    file.puts strip_require("tmp/static/ember-handlebars.js")
  end
end

# Minify dist/ember.js to dist/ember.min.js
file "dist/ember.min.js" => "dist/ember.js" do
  puts "Generating ember.min.js"

  File.open("dist/ember.prod.js", "w") do |file|
    file.puts strip_sc_assert("dist/ember.js")
  end

  File.open("dist/ember.min.js", "w") do |file|
    file.puts uglify("dist/ember.prod.js")
  end

  rm "dist/ember.prod.js"
end

EMBER_VERSION = File.read("VERSION").strip

desc "bump the version to the specified version"
task :bump_version, :version do |t, args|
  version = args[:version]

  File.open("VERSION", "w") { |file| file.write version }

  # Bump the version of subcomponents required by the "umbrella" ember
  # package.
  contents = File.read("packages/ember/package.json")
  contents.gsub! %r{"ember-(\w+)": .*$} do
    %{"ember-#{$1}": "#{version}"}
  end

  File.open("packages/ember/package.json", "w") do |file|
    file.write contents
  end

  # Bump the version of each component package
  Dir["packages/ember*/package.json", "package.json"].each do |package|
    contents = File.read(package)
    contents.gsub! %r{"version": .*$}, %{"version": "#{version}",}
    contents.gsub! %r{"(ember-?\w*)": [^\n\{,]*(,?)$} do
      %{"#{$1}": "#{version}"#{$2}}
    end

    File.open(package, "w") { |file| file.write contents }
  end

  sh %{git add VERSION package.json packages/**/package.json}
  sh %{git commit -m "Bump version to #{version}"}
end

## STARTER KIT ##

namespace :starter_kit do
  ember_output = "tmp/starter-kit/js/libs/ember-#{EMBER_VERSION}.js"
  ember_min_output = "tmp/starter-kit/js/libs/ember-#{EMBER_VERSION}.min.js"

  task :pull => "tmp/starter-kit" do
    Dir.chdir("tmp/starter-kit") do
      sh "git pull origin master"
    end
  end

  task :clean => :pull do
    Dir.chdir("tmp/starter-kit") do
      rm_rf Dir["js/libs/ember*.js"]
    end
  end

  task "dist/starter-kit.#{EMBER_VERSION}.zip" => ["tmp/starter-kit/index.html"] do
    mkdir_p "dist"

    Dir.chdir("tmp") do
      sh %{zip -r ../dist/starter-kit.#{EMBER_VERSION}.zip starter-kit -x "starter-kit/.git/*"}
    end
  end

  file ember_output => [:clean, "tmp/starter-kit", "dist/ember.js"] do
    sh "cp dist/ember.js #{ember_output}"
  end

  file ember_min_output => [:clean, "tmp/starter-kit", "dist/ember.min.js"] do
    sh "cp dist/ember.min.js #{ember_min_output}"
  end

  file "tmp/starter-kit" do
    mkdir_p "tmp"

    Dir.chdir("tmp") do
      sh "git clone git://github.com/emberjs/starter-kit.git"
    end
  end

  file "tmp/starter-kit/index.html" => [ember_output, ember_min_output] do
    index = File.read("tmp/starter-kit/index.html")
    index.gsub! %r{<script src="js/libs/ember-\d\.\d.*</script>},
      %{<script src="js/libs/ember-#{EMBER_VERSION}.min.js"></script>}

    File.open("tmp/starter-kit/index.html", "w") { |f| f.write index }
  end

  task :index => "tmp/starter-kit/index.html"

  desc "Build the Ember.js starter kit"
  task :build => "dist/starter-kit.#{EMBER_VERSION}.zip"
end

desc "Build Ember.js"
task :dist => ["dist/ember.min.js"]

desc "Clean build artifacts from previous builds"
task :clean do
  sh "rm -rf tmp && rm -rf dist"
end

task :default => :dist

