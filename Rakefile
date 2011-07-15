require File.expand_path("../vendor/bundler/setup", __FILE__)
require "erb"
require "uglifier"
require "sproutcore"

LICENSE = File.read("generators/license.js")

## Some SproutCore modules expect an exports object to exist. Until bpm exists,
## just mock this out for now.

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
  result.gsub!(%r{^\s*require\(['"]([^'"])*['"]\);?\s*$}, "")
  result
end

def uglify(file)
  uglified = Uglifier.compile(File.read(file))
  "#{LICENSE}\n#{uglified}"
end

# Set up the intermediate and output directories for the interim build process

SproutCore::Compiler.intermediate = "tmp/intermediate"
SproutCore::Compiler.output       = "tmp/static"

# Create a compile task for a SproutCore package. This task will compute
# dependencies and output a single JS file for a package.
def compile_package_task(package)
  js_tasks = SproutCore::Compiler::Preprocessors::JavaScriptTask.with_input "packages/#{package}/lib/**/*.js", "."
  SproutCore::Compiler::CombineTask.with_tasks js_tasks, "#{SproutCore::Compiler.intermediate}/#{package}"
end

## TASKS ##

# Create sproutcore:package tasks for each of the SproutCore packages
namespace :sproutcore do
  %w(metal indexset runtime handlebars views datastore statechart).each do |package|
    task package => compile_package_task("sproutcore-#{package}")
  end
end

# Create a handlebars task
task :handlebars => compile_package_task("handlebars")

task :build => ["sproutcore:metal", "sproutcore:indexset", "sproutcore:runtime", "sproutcore:handlebars", "sproutcore:views", "sproutcore:datastore", "sproutcore:statechart", :handlebars]


# Strip out require lines from sproutcore.js. For the interim, requires are
# precomputed by the compiler so they are no longer necessary at runtime.
file "dist/sproutcore.js" => :build do
  puts "Generating sproutcore.js"

file "tmp/sproutcore-datastore.js" => "tmp/static/sproutcore-datastore.stripped.js" do
  File.open("tmp/sproutcore-datastore.js", "w") do |file|
    file.puts File.read("tmp/static/sproutcore-datastore.stripped.js")
  end
end

file "tmp/static/sproutcore-statechart.stripped.js" => "tmp/static/sproutcore-statechart.js" do
  File.open("tmp/static/sproutcore-statechart.stripped.js", "w") do |file|
    sproutcore = File.read("tmp/static/sproutcore-statechart.js")
    sproutcore.gsub!(%r{^\s*require\(['"]([^'"])*['"]\);?\s*$}, "")
    file.puts sproutcore
  end
end

file "tmp/sproutcore-statechart.js" => "tmp/static/sproutcore-statechart.stripped.js" do
  File.open("tmp/sproutcore-statechart.js", "w") do |file|
    file.puts File.read("tmp/static/sproutcore-statechart.stripped.js")
  end
end


file "tmp/sproutcore.min.js" => "tmp/sproutcore.js" do
  File.open("tmp/sproutcore.min.js", "w") do |file|
    uglified = Uglifier.compile(File.read("tmp/sproutcore.js"))
    file.puts "#{LICENSE}\n#{uglified}"
  end
end


  File.open("dist/sproutcore.js", "w") do |file|
    file.puts strip_require("tmp/static/handlebars.js")
    file.puts strip_require("tmp/static/sproutcore-metal.js")
    file.puts strip_require("tmp/static/sproutcore-runtime.js")
    file.puts strip_require("tmp/static/sproutcore-views.js")
    file.puts strip_require("tmp/static/sproutcore-handlebars.js")
  end
end

file "tmp/sproutcore-statechart.min.js" => "tmp/sproutcore-statechart.js" do
  File.open("tmp/sproutcore-statechart.min.js", "w") do |file|
    uglified = Uglifier.compile(File.read("tmp/sproutcore-statechart.js"))
    file.puts "#{LICENSE}\n#{uglified}"
  end
end

$threads = []
# Strip out require lines from sproutcore-datastore.js. For the interim, requires are
# precomputed by the compiler so they are no longer necessary at runtime.
file "dist/sproutcore-datastore.js" => [:build] do
  puts "Generating sproutcore-datastore.js"

  mkdir_p "dist"

  File.open("dist/sproutcore-datastore.js", "w") do |file|
    file.puts strip_require("tmp/static/sproutcore-indexset.js")
    file.puts strip_require("tmp/static/sproutcore-datastore.js")
  end
end

# Minify dist/sproutcore.js to dist/sproutcore.min.js
file "dist/sproutcore.min.js" => "dist/sproutcore.js" do
  puts "Generating sproutcore.min.js"

  File.open("dist/sproutcore.min.js", "w") do |file|
    file.puts uglify("dist/sproutcore.js")
  end
end

# Minify dist/sproutcore-datastore.js to dist/sproutcore-datastore.min.js
file "dist/sproutcore-datastore.min.js" => "dist/sproutcore-datastore.js" do
  puts "Generating sproutcore-datastore.min.js"

  File.open("dist/sproutcore-datastore.min.js", "w") do |file|
    file.puts uglify("dist/sproutcore-datastore.js")
  end
end

SC_VERSION = File.read("VERSION")

desc "bump the version to the specified version"
task :bump_version, :version do |t, args|
  File.open("VERSION", "w") { |file| file.write args[:version] }

  Dir["packages/sproutcore-*/package.json"].each do |package|
    contents = File.read(package)
    contents.gsub! %r{"version": .*$}, %{"version": "#{args[:version]}",}

    File.open(package, "w") { |file| file.write contents }
  end
end

## STARTER KIT ##

namespace :starter_kit do
  sproutcore_output = "tmp/starter-kit/js/libs/sproutcore-#{SC_VERSION}.js"
  sproutcore_min_output = "tmp/starter-kit/js/libs/sproutcore-#{SC_VERSION}.min.js"

  task :pull => "tmp/starter-kit" do
    Dir.chdir("tmp/starter-kit") do
      sh "git pull origin master"
    end
  end

  task :clean => :pull do
    Dir.chdir("tmp/starter-kit") do
      rm_rf Dir["js/libs/sproutcore*.js"]
    end
  end

  task "dist/starter-kit.#{SC_VERSION}.zip" => ["tmp/starter-kit/index.html"] do
    mkdir_p "dist"

    Dir.chdir("tmp") do
      sh %{zip -r starter-kit.#{SC_VERSION}.zip starter-kit -x "starter-kit/.git/*"}
    end
  end

  file sproutcore_output => [:clean, "tmp/starter-kit", "tmp/sproutcore.js"] do
    sh "cp tmp/sproutcore.js #{sproutcore_output}"
  end

  file sproutcore_min_output => [:clean, "tmp/starter-kit", "tmp/sproutcore.min.js"] do
    sh "cp tmp/sproutcore.min.js #{sproutcore_min_output}"
  end

  file "tmp/starter-kit" do
    mkdir_p "tmp"

    Dir.chdir("tmp") do
      sh "git clone git://github.com/sproutcore/starter-kit.git"
    end
  end

  file "tmp/starter-kit/index.html" => [sproutcore_output, sproutcore_min_output] do
    index = File.read("tmp/starter-kit/index.html")
    index.gsub! %r{<script src="js/libs/sproutcore-\d\.\d.*</script>},
      %{<script src="js/libs/sproutcore-#{SC_VERSION}.min.js"></script>}

    File.open("tmp/starter-kit/index.html", "w") { |f| f.write index }
  end

  task :index => "tmp/starter-kit/index.html"

  desc "Build the SproutCore starter kit"
  task :build => "dist/starter-kit.#{SC_VERSION}.zip"
end

desc "Build SproutCore and SproutCore Datastore"
task :dist => ["dist/sproutcore.min.js", "dist/sproutcore-datastore.min.js"]

desc "Clean build artifacts from previous builds"
task :clean do
  sh "rm -rf tmp && rm -rf dist"
end

task :default => :dist