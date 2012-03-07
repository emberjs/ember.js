require 'rake-pipeline'

module Neuter

  DEBUG = false

  class SpadeWrapper < Rake::Pipeline::FileWrapper
    
    REQUIRE_RE = %r{^\s*require\(['"]([^'"]*)['"]\);?\s*}

    # Keep track of required files
    @@required = []

    # Yes, it's called package because module is a reserved word
    def package
      @package ||= path.split('/lib/')[0].split('/').last.split('.js').last
    end
    
    def read
      source = super

      # bail if this class is used for an intermediate file (it is!)
      return source if !path.include?("/lib/")

      # Replace all requires with emptiness, and accumulate dependency sources
      prepend = ''
      source.gsub! REQUIRE_RE do |m|

        req = $1

        # Find a reason to fail
        reason = @@required.include?(req) ? 'Already required' : false
        reason ||= is_package_req(req) ? 'Required package' : false
        reason ||= is_external_req(package, req) ? "External package for #{package}" : false

        if reason
          p "Skipped #{req} required in #{path} (#{reason})" if DEBUG
        else
          @@required << req
          req_file = File.join(package, "lib", "#{req.gsub(package, '')}.js")
          prepend = prepend + self.class.new(root, req_file, encoding).read
          p "Required #{req_file} as #{req} in #{path} in package #{package}" if DEBUG
        end
        ''
      end

      source = "(function(exports) {\n#{source}\n})({});\n\n"
      "#{prepend}#{source}"
    end

    protected

    def is_package_req(req)
      !(req.include? '/')
    end

    def is_external_req(package, req)
      !(req.split('/')[0] == package)
    end
  end

  module Filters

    class NeuterFilter < Rake::Pipeline::ConcatFilter

      # Allows selective concat by passing packages array (or all if nil)
      def initialize(packages=nil, string=nil, &block)
        @packages = packages
        @file_wrapper_class = SpadeWrapper
        super(string, &block)
      end

      def generate_output(inputs, output)
        inputs.each do |input|
          if !(@packages.nil? || @packages.include?(input.path.split('/').first))
            p "Not neutering: #{input.path}" if DEBUG
            next
          end
          spade = SpadeWrapper.new(input.root, input.path, input.encoding)
          p "Neutering #{input.path} into #{output.path}" if DEBUG
          output.write spade.read          
        end
      end
    end

    class SelectFilter < Rake::Pipeline::ConcatFilter

      # Allows selective concat by passing packages array (or all if nil)
      def initialize(packages=nil, string=nil, &block)
        @packages = packages || []
        super(string, &block)
      end

      def generate_output(inputs, output)
        inputs.each do |input|
          next unless @packages.include?(input.path)
          output.write input.read
        end
      end
    end
  end

  module Helpers
    def neuter(*args, &block)
      filter(Neuter::Filters::NeuterFilter, *args, &block)
    end

    def select(*args, &block)
      filter(Neuter::Filters::SelectFilter, *args, &block)
    end
  end
end

Rake::Pipeline::DSL::PipelineDSL.send(:include, Neuter::Helpers)