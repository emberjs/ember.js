# -*- encoding: utf-8 -*-
require "./lib/ember/version"

Gem::Specification.new do |gem|
  gem.name          = "ember-source"
  gem.authors       = ["Yehuda Katz"]
  gem.email         = ["wycats@gmail.com"]
  gem.date          = Time.now.strftime("%Y-%m-%d")
  gem.summary       = %q{Ember.js source code wrapper.}
  gem.description   = %q{Ember.js source code wrapper for use with Ruby libs.}
  gem.homepage      = "https://github.com/emberjs/ember.js"

  gem.version       = Ember.rubygems_version_string

  gem.add_dependency "handlebars-source", ["1.0.12"]

  gem.files = %w(VERSION) + Dir['dist/*.js', 'lib/ember/*.rb']
end
