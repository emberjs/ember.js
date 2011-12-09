require "bundler/setup"
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

# Create a compile task for a SproutCore package. This task will compute
# dependencies and output a single JS file for a package.
def compile_package_task(package)
  js_tasks = SproutCore::Compiler::Preprocessors::JavaScriptTask.with_input "packages/#{package}/lib/**/*.js", "."
  SproutCore::Compiler::CombineTask.with_tasks js_tasks, "#{SproutCore::Compiler.intermediate}/#{package}"
end

## TASKS ##

# Create sproutcore:package tasks for each of the SproutCore packages
namespace :sproutcore do
  %w(metal runtime handlebars views states).each do |package|
    task package => compile_package_task("sproutcore-#{package}")
  end
end

# Create a handlebars task
task :handlebars => compile_package_task("handlebars")

# Create a metamorph task
task :metamorph => compile_package_task("metamorph")

# Create a build task that depends on all of the package dependencies
task :build => ["sproutcore:metal", "sproutcore:runtime", "sproutcore:handlebars", "sproutcore:views", "sproutcore:states", :handlebars, :metamorph]

# Strip out require lines from sproutcore.js. For the interim, requires are
# precomputed by the compiler so they are no longer necessary at runtime.
file "dist/sproutcore.js" => :build do
  puts "Generating sproutcore.js"

  mkdir_p "dist"

  File.open("dist/sproutcore.js", "w") do |file|
    file.puts strip_require("tmp/static/handlebars.js")
    file.puts strip_require("tmp/static/sproutcore-metal.js")
    file.puts strip_require("tmp/static/sproutcore-runtime.js")
    file.puts strip_require("tmp/static/sproutcore-views.js")
    file.puts strip_require("tmp/static/sproutcore-states.js")
    file.puts strip_require("tmp/static/metamorph.js")
    file.puts strip_require("tmp/static/sproutcore-handlebars.js")
  end
end

# Minify dist/sproutcore.js to dist/sproutcore.min.js
file "dist/sproutcore.min.js" => "dist/sproutcore.js" do
  puts "Generating sproutcore.min.js"

  File.open("dist/sproutcore.prod.js", "w") do |file|
    file.puts strip_sc_assert("dist/sproutcore.js")
  end

  File.open("dist/sproutcore.min.js", "w") do |file|
    file.puts uglify("dist/sproutcore.prod.js")
  end

  rm "dist/sproutcore.prod.js"
end

SC_VERSION = File.read("VERSION")

desc "bump the version to the specified version"
task :bump_version, :version do |t, args|
  version = args[:version]

  File.open("VERSION", "w") { |file| file.write version }

  # Bump the version of subcomponents required by the "umbrella" sproutcore
  # package.
  contents = File.read("packages/sproutcore/package.json")
  contents.gsub! %r{"sproutcore-(\w+)": .*$} do
    %{"sproutcore-#{$1}": "#{version}"}
  end

  File.open("packages/sproutcore/package.json", "w") do |file|
    file.write contents
  end

  # Bump the version of each component package
  Dir["packages/sproutcore*/package.json", "package.json"].each do |package|
    contents = File.read(package)
    contents.gsub! %r{"version": .*$}, %{"version": "#{version}",}
    contents.gsub! %r{"(sproutcore-?\w*)": [^\n\{,]*(,?)$} do
      %{"#{$1}": "#{version}"#{$2}}
    end

    File.open(package, "w") { |file| file.write contents }
  end

  sh %{git add VERSION package.json packages/**/package.json}
  sh %{git commit -m "Bump version to #{version}"}
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
      sh %{zip -r ../dist/starter-kit.#{SC_VERSION}.zip starter-kit -x "starter-kit/.git/*"}
    end
  end

  file sproutcore_output => [:clean, "tmp/starter-kit", "dist/sproutcore.js"] do
    sh "cp dist/sproutcore.js #{sproutcore_output}"
  end

  file sproutcore_min_output => [:clean, "tmp/starter-kit", "dist/sproutcore.min.js"] do
    sh "cp dist/sproutcore.min.js #{sproutcore_min_output}"
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

desc "Build SproutCore"
task :dist => ["dist/sproutcore.min.js"]

desc "Clean build artifacts from previous builds"
task :clean do
  sh "rm -rf tmp && rm -rf dist"
end

task :default => :dist

