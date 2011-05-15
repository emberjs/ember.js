require "bundler/setup"
require "sproutcore"
require "erb"

def uglify(string)
  IO.popen("uglifyjs", "r+") do |io|
    io.puts string
    io.close_write
    return io.read
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

sc_runtime = SproutCore::Compiler::Preprocessors::JavaScriptTask.with_input "lib/sproutcore-runtime/lib/**/*.js", "."
sc_runtime = SproutCore::Compiler::CombineTask.with_tasks sc_runtime, "#{SproutCore::Compiler.intermediate}/sproutcore-runtime"

sc_handlebars = SproutCore::Compiler::Preprocessors::JavaScriptTask.with_input "lib/sproutcore-handlebars/lib/**/*.js", "."
sc_handlebars = SproutCore::Compiler::CombineTask.with_tasks sc_handlebars, "#{SproutCore::Compiler.intermediate}/sproutcore-handlebars"

sc_views = SproutCore::Compiler::Preprocessors::JavaScriptTask.with_input "lib/sproutcore-views/lib/**/*.js", "."
sc_views = SproutCore::Compiler::CombineTask.with_tasks sc_views, "#{SproutCore::Compiler.intermediate}/sproutcore-views"

handlebars = SproutCore::Compiler::Preprocessors::JavaScriptTask.with_input "lib/handlebars/lib/**/*.js", "."
handlebars = SproutCore::Compiler::CombineTask.with_tasks handlebars, "#{SproutCore::Compiler.intermediate}/handlebars"

namespace :sproutcore do
  task :runtime => sc_runtime
  task :handlebars => sc_handlebars
  task :views => sc_views
end

task :handlebars => handlebars

task :build => ["sproutcore:runtime", "sproutcore:handlebars", "sproutcore:views", :handlebars]

file "tmp/static/sproutcore.js"=> :build do
  File.open("tmp/static/sproutcore.js", "w") do |file|
    file.puts File.read("tmp/static/handlebars.js")
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

file "tmp/sproutcore.js" => "tmp/static/sproutcore.stripped.js" do
  File.open("tmp/sproutcore.js", "w") do |file|
    sproutcore = File.read("tmp/static/sproutcore.stripped.js")
    file.puts sproutcore
    # file.puts uglify(File.read("tmp/static/sproutcore.stripped.js"))
  end
end

$threads = []

trap "INT" do
  $threads.each(&:kill)
end

VERSION = "2.0"

def spade_update_task(package)
  path = "lib/#{package}"
  dest = "#{path}/spade-boot.js"
  source = Dir["#{path}/**/*.js"] - ["#{path}/spade-boot.js"]

  file dest => source do
    Dir.chdir(path) { sh "spade update" }
  end
end

def spade_build_task(package)
  path = "lib/#{package}"
  dest = "#{path}/#{package}-#{VERSION}.spd"
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
    $threads << Thread.new { sh "cd lib/#{package} && spade preview" }
    sleep 5
    sh "open http://localhost:4020/test_#{package}.html"
    $threads.each(&:join)
  end
end

def generate_test_files(package)
  dest = "lib/#{package}/test_#{package}.html"

  file dest do
    html_template = File.read("generators/tests.html.erb")
    erb = ERB.new(html_template)

    File.open(dest, "w") do |file|
      file.puts erb.result(binding)
    end
  end
end

namespace :test do
  runtime_spade_boot    = spade_update_task "sproutcore-runtime"
  views_spade_boot      = spade_update_task "sproutcore-views"
  handlebars_spade_boot = spade_update_task "sproutcore-handlebars"

  runtime_package       = spade_build_task "sproutcore-runtime"
  runtime_installed     = spade_install_task runtime_package
  runtime_test_files    = generate_test_files "sproutcore-runtime"

  views_package         = spade_build_task "sproutcore-views"
  views_installed       = spade_install_task views_package
  views_test_files      = generate_test_files "sproutcore-views"

  handlebars_test_files = generate_test_files "sproutcore-handlebars"

  spade_preview_task "sproutcore-runtime",    [runtime_spade_boot, runtime_test_files]
  spade_preview_task "sproutcore-views",      [runtime_installed, views_spade_boot, views_test_files]
  spade_preview_task "sproutcore-handlebars", [runtime_installed, views_installed, handlebars_spade_boot, handlebars_test_files]
end

task :default => "tmp/sproutcore.js"

