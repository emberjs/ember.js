require "bundler/setup"

EMBER_VERSION = File.read("VERSION").strip

require_relative 'tasks/distribute'
require_relative 'tasks/release'
require_relative 'tasks/test'


def pipeline
  require 'rake-pipeline'
  Rake::Pipeline::Project.new("Assetfile")
end

def distribution_files
  ["dist/ember.js", "dist/ember.min.js"]
end

def pretend?
  ENV['PRETEND']
end

desc "Strip trailing whitespace for JavaScript files in packages"
task :strip_whitespace do
  Dir["packages/**/*.js"].each do |name|
    body = File.read(name)
    File.open(name, "w") do |file|
      file.write body.gsub(/ +\n/, "\n")
    end
  end
end

task :default => :test
