require File.expand_path("../vendor/bundler/setup", __FILE__)
require "erb"
require "uglifier"
require "sproutcore"

LICENSE = File.read("generators/license.js")

module SproutCore
  module Compiler
    class Entry
      def body
        "\n(function(exports) {\n#{@raw_body}\n})({});\n"
      end
    end
  end
end

SproutCore::Compiler.intermediate = "tmp/intermediate"
SproutCore::Compiler.output       = "tmp/static"

# SproutCore::Compiler.import_package "lib/sproutcore-runtime"
# SproutCore::Compiler.import_package "lib/sproutcore-views"
# SproutCore::Compiler.import_package "lib/sproutcore-handlebars"
#
# SproutCore::Compiler.import_package "lib/sproutcore"
# SproutCore::Compiler.root "sproutcore"

def compile_package_task(package)
  js_tasks = SproutCore::Compiler::Preprocessors::JavaScriptTask.with_input "packages/#{package}/lib/**/*.js", "."
  SproutCore::Compiler::CombineTask.with_tasks js_tasks, "#{SproutCore::Compiler.intermediate}/#{package}"
end

namespace :sproutcore do
  %w(metal indexset runtime handlebars views datastore).each do |package|
    task package => compile_package_task("sproutcore-#{package}")
  end
end

task :handlebars => compile_package_task("handlebars")

task :build => ["sproutcore:metal", "sproutcore:indexset", "sproutcore:runtime", "sproutcore:handlebars", "sproutcore:views", "sproutcore:datastore", :handlebars]

directory "dist"

file "tmp/static/sproutcore.js" => :build do
  File.open("tmp/static/sproutcore.js", "w") do |file|
    file.puts File.read("tmp/static/handlebars.js")
    file.puts File.read("tmp/static/sproutcore-metal.js")
    file.puts File.read("tmp/static/sproutcore-runtime.js")
    file.puts File.read("tmp/static/sproutcore-views.js")
    file.puts File.read("tmp/static/sproutcore-handlebars.js")
  end
end

file "tmp/static/sproutcore.stripped.js" => "tmp/static/sproutcore.js" do
  File.open("tmp/static/sproutcore.stripped.js", "w") do |file|
    sproutcore = File.read("tmp/static/sproutcore.js")
    sproutcore.gsub!(%r{^\s*require\(['"]([^'"])*['"]\);?\s*$}, "")
    file.puts sproutcore
  end
end

file "tmp/static/sproutcore-datastore.stripped.js" => "tmp/static/sproutcore-datastore.js" do
  File.open("tmp/static/sproutcore-datastore.stripped.js", "w") do |file|
    indexset = File.read("tmp/static/sproutcore-indexset.js")
    indexset.gsub!(%r{^\s*require\(['"]([^'"])*['"]\);?\s*$}, "")
    
    datastore = File.read("tmp/static/sproutcore-datastore.js")
    datastore.gsub!(%r{^\s*require\(['"]([^'"])*['"]\);?\s*$}, "")
    
    file.puts indexset
    file.puts datastore
  end
end

file "dist/sproutcore.js" => ["dist", "tmp/static/sproutcore.stripped.js"] do
  puts "Generating sproutcore.js"

  File.open("dist/sproutcore.js", "w") do |file|
    file.puts File.read("tmp/static/sproutcore.stripped.js")
  end
end

file "dist/sproutcore-datastore.js" => ["dist", "tmp/static/sproutcore-datastore.stripped.js"] do
  puts "Generating sproutcore-datastore.js"

  File.open("dist/sproutcore-datastore.js", "w") do |file|
    file.puts File.read("tmp/static/sproutcore-datastore.stripped.js")
  end
end

file "dist/sproutcore.min.js" => "dist/sproutcore.js" do
  puts "Generating sproutcore.min.js"
  File.open("dist/sproutcore.min.js", "w") do |file|
    uglified = Uglifier.compile(File.read("dist/sproutcore.js"))
    file.puts "#{LICENSE}\n#{uglified}"
  end
end

file "dist/sproutcore-datastore.min.js" => "dist/sproutcore-datastore.js" do
  puts "Generating sproutcore-datastore.min.js"

  File.open("dist/sproutcore-datastore.min.js", "w") do |file|
    uglified = Uglifier.compile(File.read("dist/sproutcore-datastore.js"))
    file.puts "#{LICENSE}\n#{uglified}"
  end
end

$threads = []

trap "INT" do
  $threads.each(&:kill)
end

SC_VERSION = File.read("VERSION")

def spade_update_task(package)
  path = "packages/#{package}"
  dest = "#{path}/spade-boot.js"
  source = Dir["#{path}/**/*.js"] - ["#{path}/spade-boot.js"]

  file dest => source do
    Dir.chdir(path) { sh "spade update" }
  end
end

def spade_build_task(package, version=SC_VERSION)
  path = "packages/#{package}"
  dest = "#{path}/#{package}-#{version}.spd"
  source = Dir["#{path}/**/*.js"] - ["#{path}/spade-boot.js"]

  file dest => source do
    Dir.chdir(path) { sh "spade build" }
  end
end

def spade_install_task(build_task)
  package = File.basename(build_task.name).sub(/\.spd$/, '')

  dest = File.expand_path("~/.spade/gems/#{package}/package.json")

  file dest => build_task do
    Dir.chdir(File.dirname(build_task.name)) do
      sh "spade install #{package}"
    end
  end
end

def spade_preview_task(package, deps)
  task package => deps do
    $threads << Thread.new { sh "cd packages/#{package} && spade preview" }
    sleep 3
    sh "open http://localhost:4020/test_#{package}.html"
    $threads.each(&:join)
  end
end

def generate_test_files(package)
  html_dest = "packages/#{package}/test_#{package}.html"
  html_source = "generators/tests.html.erb"

  js_dest = "packages/#{package}/tests/all.js"
  js_source = "generators/all.js.erb"

  { js_source => js_dest, html_source => html_dest }.each do |source, dest|
    file dest => source do
      template = File.read(source)
      erb = ERB.new(template)

      File.open(dest, "w") do |file|
        file.puts erb.result(binding)
      end
    end
  end

  qunit_dest = "packages/#{package}/tests/qunit.js"
  qunit_css_dest = "packages/#{package}/tests/qunit-style.css"

  file qunit_dest => "generators/qunit.js" do
    File.open(qunit_dest, "w") do |file|
      file.puts File.read("generators/qunit.js")
    end
  end

  file qunit_css_dest => "generators/qunit-style.css" do
    File.open(qunit_css_dest, "w") do |file|
      file.puts File.read("generators/qunit-style.css")
    end
  end

  [js_dest, html_dest, qunit_dest, qunit_css_dest]
end

task :closure_docs do
  rm_rf "packages_docs"
  mkdir_p "packages_docs"
  cp_r "packages", "packages_docs"

  Dir["packages_docs/**/*.js"].each do |file|
    body = File.read(file)

    File.open(file, "w") do |f|
      f.puts "(function() {\n#{body}\n})()\n"
    end
  end

  rm_rf Dir["packages_docs/packages/{handlebars,jquery}"]
  rm_rf Dir["packages_docs/packages/**/tests"]
  rm_rf Dir["packages_docs/packages/sproutcore-{datetime,datastore,indexset}"]
end

namespace :test do
  metal_spade_boot      = spade_update_task "sproutcore-metal"
  views_spade_boot      = spade_update_task "sproutcore-views"
  handlebars_spade_boot = spade_update_task "sproutcore-handlebars"
  datastore_spade_boot  = spade_update_task "sproutcore-datastore"

  handlebars_package    = spade_build_task "handlebars", '1.0.0.beta.2'
  handlebars_installed  = spade_install_task handlebars_package

  metal_package         = spade_build_task "sproutcore-metal"
  metal_installed       = spade_install_task metal_package
  metal_test_files      = generate_test_files "sproutcore-metal"

  views_package         = spade_build_task "sproutcore-views"
  views_installed       = spade_install_task views_package
  views_test_files      = generate_test_files "sproutcore-views"

  handlebars_test_files = generate_test_files "sproutcore-handlebars"

  datastore_test_files  = generate_test_files "sproutcore-datastore"

  spade_preview_task "sproutcore-metal",      [metal_spade_boot] + metal_test_files
  spade_preview_task "sproutcore-views",      [metal_installed, views_spade_boot] + views_test_files
  spade_preview_task "sproutcore-handlebars", [metal_installed, views_installed, handlebars_spade_boot, handlebars_installed] + handlebars_test_files
  spade_preview_task "sproutcore-datastore",  [metal_installed, datastore_spade_boot] + datastore_test_files
end

task :bump_version, :version do |t, args|
  File.open("VERSION", "w") { |file| file.write args[:version] }

  Dir["packages/sproutcore-*/package.json"].each do |package|
    contents = File.read(package)
    contents.gsub! %r{"version": .*$}, %{"version": "#{args[:version]}",}

    File.open(package, "w") { |file| file.write contents }
  end
end

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

  task "tmp/starter-kit.#{SC_VERSION}.zip" => "tmp/starter-kit/index.html" do
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

  task :build => "tmp/starter-kit/index.html"
  task :deploy => "tmp/starter-kit.#{SC_VERSION}.zip"
end

task :default => ["dist/sproutcore.min.js", "dist/sproutcore-datastore.min.js"]

