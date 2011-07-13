require "rubygems"
require "bundler/setup"
require "fileutils"

require "sproutcore"
require "support/builders"
require "support/cli"

module SproutCore
  module Spec
    module TmpDir
      def self.included(klass)
        klass.class_eval do
          let(:tmp) { Pathname.new(File.expand_path("../../tmp", __FILE__)) }

          before do
            FileUtils.rm_rf(tmp)
            FileUtils.mkdir_p(tmp)
          end
        end
      end
    end

    module Setup
      include SproutCore::Compiler

      def self.included(klass)
        klass.class_eval do
          let(:root) { tmp.join("rake") }
          let(:intermediate) { root.join("tmp/intermediate") }
          let(:output) { root.join("tmp/static") }

          before do
            FileUtils.rm_rf(root)
            FileUtils.mkdir_p(root)
          end
        end
      end

      def file_system(path, &block)
        SproutCore::Spec::DirectoryBuilder.new(tmp.join(path), &block)
      end

      def rakefile_tasks(string)
        base = <<-RAKE.gsub(/^          /, "")
          require "sproutcore"
          SproutCore::Compiler.intermediate = "#{root}/tmp/intermediate"
          SproutCore::Compiler.output       = "#{root}/tmp/static"
        RAKE

        string = "#{base}\ntasks = #{string}\ntask(:default => tasks)"

        rakefile(string)
      end

      def rakefile(string)
        File.open(root.join("Rakefile"), "w") do |file|
          file.puts string
        end
      end

    end
  end
end

RSpec.configure do |config|
  config.include SproutCore::Spec::TmpDir
  config.include SproutCore::Spec::CLIExecution
  config.include SproutCore::Spec::Setup
end

