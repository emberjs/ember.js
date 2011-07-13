require "execjs/version"
require "rbconfig"

module ExecJS
  class Error           < ::StandardError; end
  class RuntimeError              < Error; end
  class ProgramError              < Error; end
  class RuntimeUnavailable < RuntimeError; end

  class << self
    attr_reader :runtime

    def runtime=(runtime)
      raise RuntimeUnavailable, "#{runtime.name} is unavailable on this system" unless runtime.available?
      @runtime = runtime
    end

    def exec(source)
      runtime.exec(source)
    end

    def eval(source)
      runtime.eval(source)
    end

    def compile(source)
      runtime.compile(source)
    end

    def root
      @root ||= File.expand_path("..", __FILE__)
    end

    def windows?
      @windows ||= RbConfig::CONFIG["host_os"] =~ /mswin|mingw/
    end
  end
end
