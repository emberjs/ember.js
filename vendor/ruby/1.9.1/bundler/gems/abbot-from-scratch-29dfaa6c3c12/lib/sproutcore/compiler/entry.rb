module SproutCore
  module Compiler
    # The entry is a simple abstraction that takes in a name and a body
    # and can extract dependencies from the body based on a pattern
    #
    # It will automatically assume that dependencies without an extension
    # have the same extension as the entry's file name
    class Entry
      attr_reader :name, :body

      DEP_REGEX = %r{\b(?:sc_)?require\(['"]([^'"]*)['"]\)}

      def initialize(name, body, regex = DEP_REGEX)
        @name, @raw_body = name, body
        @extension = name.include?(".") && name.split(".").last
        @regex = regex
      end

      def body
        "\n(function() {\n#{@raw_body}\n})();\n"
      end

      def dependencies
        @dependencies ||= begin
          @raw_body.scan(@regex).map do |match|
            dep = match.last

            if !dep.include?(".") && @extension
              dep = [match.last, @extension].join(".")
            end

            dep
          end
        end
      end
    end
  end
end
