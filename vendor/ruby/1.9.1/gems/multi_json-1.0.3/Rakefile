#!/usr/bin/env rake
begin
  require 'bundler'
  Bundler::GemHelper.install_tasks
rescue LoadError => e
  warn "[WARNING]: It is recommended that you use bundler during development: gem install bundler"
end

require 'rspec/core/rake_task'
desc "Run all examples"
RSpec::Core::RakeTask.new(:spec)

task :default => :spec
task :test => :spec

require 'rdoc/task'
Rake::RDocTask.new do |rdoc|
  rdoc.rdoc_dir = 'rdoc'
  rdoc.title = "multi_json #{MultiJson::VERSION}"
  rdoc.rdoc_files.include('README.md')
  rdoc.rdoc_files.include('LICENSE.md')
  rdoc.rdoc_files.include('lib/**/*.rb')
end
