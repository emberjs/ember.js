require "spec_helper"

describe "Orderer" do
  include SproutCore::Compiler

  class SimpleEntry < SproutCore::Compiler::Entry
    def initialize(name, deps)
      body = deps.map { |dep| %{require("#{dep}")} }.join("\n")

      super(name, body)
    end
  end

  before do
    @orderer = Orderer.new
  end

  describe "simple reordering" do
    before do
      @orderer.add SimpleEntry.new("system", ["core"])
      @orderer.add SimpleEntry.new("observable", ["system", "core"])
      @orderer.add SimpleEntry.new("core", [])
    end

    it "returns a sorted list with sort!" do
      output = @orderer.sort!
      output.map(&:name).should == ["core", "system", "observable"]
    end

    it "is enumerable" do
      @orderer.map(&:name).should == ["core", "system", "observable"]
    end
  end

  describe "normalized extensions" do
    before do
      @orderer.add SimpleEntry.new("system.js", ["core"])
      @orderer.add SimpleEntry.new("observable.js", ["system.js", "core"])
      @orderer.add SimpleEntry.new("core.js", [])
    end

    it "returns a sorted list with sort!" do
      output = @orderer.sort!
      output.map(&:name).should == ["core.js", "system.js", "observable.js"]
    end

    it "is enumerable" do
      @orderer.map(&:name).should == ["core.js", "system.js", "observable.js"]
    end
  end

  describe "'circular' dependencies" do
    before do
      @orderer.add SimpleEntry.new("system", ["core"])
      @orderer.add SimpleEntry.new("observable", ["system", "core"])
      @orderer.add SimpleEntry.new("pane", ["core", "split_pane"])
      @orderer.add SimpleEntry.new("split_pane", ["core", "pane"])
      @orderer.add SimpleEntry.new("core", [])
    end

    it "handles 'circular' dependencies in the order they were added" do
      output = @orderer.sort!
      output.map(&:name).should == ["core", "system", "observable", "split_pane", "pane"]
    end

    it "is enumerable" do
      @orderer.map(&:name).should == ["core", "system", "observable", "split_pane", "pane"]
    end
  end

  describe "optional entries" do
    before do
      @orderer.add SimpleEntry.new("bindings.js", ["observable.js", "core"])
      @orderer.add SimpleEntry.new("core.js", [])

      @orderer.add_optional SimpleEntry.new("observable.js", ["core", "system"])
      @orderer.add_optional SimpleEntry.new("range_observer.js", ["core", "system.js", "observable"])
      @orderer.add_optional SimpleEntry.new("system.js", ["core.js"])
    end

    it "returns a sorted list with sort!" do
      output = @orderer.sort!
      output.map(&:name).should == ["core.js", "system.js", "observable.js", "bindings.js"]
    end

    it "is enumerable" do
      @orderer.map(&:name).should == ["core.js", "system.js", "observable.js", "bindings.js"]
    end
  end
end
