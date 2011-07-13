require "spec_helper"

describe "combining" do
  describe "without requires" do
    before do
      file_system(intermediate) do
        directory "runtime" do
          file "core.js", "// BEGIN: core.js\n// END: core.js\n"

          directory "system" do
            file "binding.js",    "// BEGIN: system/binding.js\n// END: system/binding.js\n"
            file "enumerator.js", "// BEGIN: system/enumerator.js\n// END: system/enumerator.js\n"
          end
        end
      end
    end

    it "combines the files" do
      rakefile_tasks %{SproutCore::Compiler::CombineTask.with_input File.expand_path("tmp/intermediate/runtime"), "**/*.js", SproutCore::Compiler.intermediate}
      rake

      expected = %w(core.js system/binding.js system/enumerator.js).map do |file|
        File.read(intermediate.join("runtime/#{file}"))
      end
      output.join("runtime.js").read.should == expected.join("\n")
    end

    it "orders files based on their contents" do
      file_system(intermediate) do
        directory "runtime" do
          directory "system" do
            file "apple.js",      "require('runtime/system/enumerator')\n// BEGIN: system/apple.js\nEND: system/apple.js"
            file "binding.js",    "// BEGIN: system/binding.js\n// END: system/binding.js\n"
            file "enumerator.js", "// BEGIN: system/enumerator.js\n// END: system/enumerator.js\n"
          end
        end
      end

      rakefile_tasks %{SproutCore::Compiler::CombineTask.with_input File.expand_path("tmp/intermediate/runtime"), "**/*.js", SproutCore::Compiler.intermediate}
      rake

      expected = %w(core.js system/enumerator.js system/apple.js system/binding.js).map do |file|
        File.read(intermediate.join("runtime/#{file}"))
      end
      output.join("runtime.js").read.should == expected.join("\n")
    end
  end

  describe "with preprocessor tasks as input" do
    before do
      file_system(root) do
        directory "lib/runtime" do
          file "system.js" do
            write "// BEGIN: system\nsc_super()\n// END: system\n"
          end
          file "core.js" do
            write "require('runtime/system')\n// BEGIN: core\nsc_super()\n// END: core\n"
          end
        end
      end

      rakefile <<-RAKE
        require "sproutcore"
        SproutCore::Compiler.intermediate = "#{root}/tmp/intermediate"
        SproutCore::Compiler.output       = "#{root}/tmp/static"
        tasks = SproutCore::Compiler::Preprocessors::JavaScriptTask.with_input "lib/runtime/**/*.js", "#{root}"
        tasks = SproutCore::Compiler::CombineTask.with_tasks tasks, "#{intermediate}/runtime"
        task(:default => tasks)
      RAKE
    end

    it "places the preprocessed files in the intermediate location" do
      rake
      output.join("runtime.js").read.should == "// BEGIN: system\narguments.callee.base.apply(this,arguments)\n// END: system\n\nrequire('runtime/system')\n// BEGIN: core\narguments.callee.base.apply(this,arguments)\n// END: core\n"
    end
  end
end
