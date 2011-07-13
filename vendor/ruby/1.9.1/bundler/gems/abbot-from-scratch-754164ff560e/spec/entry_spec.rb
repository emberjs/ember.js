require "spec_helper"

describe "Entry" do
  include SproutCore::Compiler

  before do
    @name  = "core.js"
    @body  = "// BEGIN: core.js\n//END: core.js"
    @entry = Entry.new(@name, @body)
  end

  it "has a name and body" do
    @entry.name.should == @name
    @entry.body.should == @body
  end

  %w[require('core.js') require("core.js") sc_require('core.js') sc_require("core.js")].each do |item|
    it "knows about dependencies specified using #{item}" do
      entry = Entry.new("system.js", item)
      entry.dependencies.should == ["core.js"]
    end
  end

  it "doesn't get confused by zomg_require" do
    entry = Entry.new("system.js", %{zomg_require('zomg.js')\nrequire('core.js')})
    entry.dependencies.should == ["core.js"]
  end

  it "normalizes extensions" do
    entry = Entry.new("system.js", %{require('core')\nsc_require('base.js')})
    entry.dependencies.should == ["core.js", "base.js"]
  end
end
