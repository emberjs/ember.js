require 'distribute'

namespace :distribute do
  desc "Clean build artifacts from previous builds"
  task :clean do
    rm_rf "dist/"
    rm_rf "tmp/"
    rm_f "tests/ember-tests.js"
  end

  desc "Build ember.js"
  task :build => :clean do
    puts "Building pipeline"
    pipeline.invoke
  end

  desc "Distribute a tagged release of the ember.js builds"
  task :release => :build do
    Release.new(distribution_files, EMBER_VERSION).distribute!
  end

  desc "Distribute the latest ember.js builds"
  task :latest => :build do
    Latest.new(distribution_files).distribute!
  end
end
