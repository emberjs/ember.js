require "bundler/setup"
require "sproutcore"

SproutCore::Compiler.intermediate = "tmp/intermediate"
SproutCore::Compiler.output       = "tmp/static"
tasks = SproutCore::Compiler::Preprocessors::JavaScriptTask.with_input "lib/sproutcore-runtime/lib/**/*.js", "."
tasks = SproutCore::Compiler::CombineTask.with_tasks tasks, "#{SproutCore::Compiler.intermediate}/sproutcore-runtime"

task(:default => tasks)

