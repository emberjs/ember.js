require "bundler/setup"
require "sproutcore"

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

task :default => "tmp/sproutcore.js"

