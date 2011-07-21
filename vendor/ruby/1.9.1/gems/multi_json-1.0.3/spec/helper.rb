begin
  require 'bundler'
  Bundler.setup
rescue LoadError
  warn "[WARNING]: It is recommended that you use bundler during development: gem install bundler"
end

require 'simplecov'
SimpleCov.start
require 'rspec'
require 'multi_json'
