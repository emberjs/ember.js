module SproutCore
  module Compiler
    # The purpose of this class is to create a sorting algorithm that approximates
    # Ruby's require algorithm.
    #
    # It works by adding entries in the order they were added, but adding
    # dependencies first (also in the order they were specified). Once an entry 
    # has been added, it will not be added again.
    #
    # This allows for "circular" dependencies, where two files both need to
    # exist, but their order doesn't matter. This is a case where neither entry
    # technically depends on the other one, but the full expected functionality
    # requires both entries.
    class Orderer
      include Enumerable

      def initialize
        @entries      = []
        @entry_map    = {}
        @sorted       = []
        @seen         = Set.new
      end

      def add(entry)
        @entries << entry
        @entry_map[entry.name] = entry
      end

      def add_optional(entry)
        @entry_map[entry.name] = entry
      end

      def each
        sort!

        @sorted.each do |item|
          yield item
        end
      end

      def sort!
        @entries.each { |entry| require_entry(entry) }
        @sorted
      end

      def require_entry(entry, parent=nil)
        return if @seen.include?(entry)
        @seen << entry

        entry.dependencies.each do |dep|
          unless @entry_map.key?(dep)
            # For now, if it's a cross-package dependency, just move on
            local_package = entry.name.split("/").first
            dep_package = dep.split("/").first

            next if local_package != dep_package

            str = "No such entry #{dep} "
            str << "required from #{entry.name} "
            str << "in:\n#{@entries.map(&:name).join("\n")}"
            raise str
          end

          require_entry(@entry_map[dep], entry)
        end

        @sorted << entry
      end
    end
  end
end
