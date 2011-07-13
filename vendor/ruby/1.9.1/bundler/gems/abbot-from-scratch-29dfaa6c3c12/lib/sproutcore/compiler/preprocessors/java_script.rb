require "pathname"

module SproutCore
  module Compiler
    module Preprocessors
      class JavaScript < Base
        def process
          super
          @string.gsub!(/sc_super\(\s*\)/, 'arguments.callee.base.apply(this,arguments)')
          @string
        end
      end

      class JavaScriptTask < Rake::FileTask
        # Create a series of Preprocessor tasks for the inputs
        def self.with_input(glob, package_root)
          Dir[File.join(package_root, glob)].sort.map do |input|
            output = output_location(input, package_root)

            # Create a new Preprocessor task to convert the raw input into
            # preprocessed output in the intermediate location
            task = define_task(output)
            task.prerequisites << Rake::FileTask.new(input, Rake.application)
            task
          end
        end

        # This method will get updated over time as more types of inputs
        # result in different outputs
        def self.output_location(input, package_root)
          parts = input.sub(%r{^#{package_root}/}, '').split("/") - ["lib", "packages", "frameworks"]
          File.join(Compiler.intermediate, parts.join("/"))
        end

        def execute(*)
          input_file = @prerequisites.first.name
          FileUtils.mkdir_p(File.dirname(@name))

          input = File.read(input_file)

          File.open(@name, "w") do |file|
            file.puts JavaScript.new(input).process
          end
        end
      end
    end
  end
end

