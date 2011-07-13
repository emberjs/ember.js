module SproutCore
  module Compiler
    autoload :CombineTask,       "sproutcore/compiler/combine_task"
    autoload :Entry,             "sproutcore/compiler/entry"
    autoload :Orderer,           "sproutcore/compiler/orderer"
    autoload :Preprocessors,     "sproutcore/compiler/preprocessors"
    autoload :VirtualFileSystem, "sproutcore/compiler/virtual_file_system"

    class << self
      attr_accessor :intermediate, :output
    end
  end
end
