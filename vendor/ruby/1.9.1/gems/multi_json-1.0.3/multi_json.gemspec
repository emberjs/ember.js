# -*- encoding: utf-8 -*-
require File.expand_path("../lib/multi_json/version", __FILE__)

Gem::Specification.new do |gem|
  gem.add_development_dependency 'rake', '~> 0.9'
  gem.add_development_dependency 'rdoc', '3.5.1'
  gem.add_development_dependency 'rspec', '~> 2.6'
  gem.add_development_dependency 'simplecov', '~> 0.4'
  gem.authors = ["Michael Bleigh", "Josh Kalderimis", "Erik Michaels-Ober"]
  gem.description = %q{A gem to provide swappable JSON backends utilizing Yajl::Ruby, the JSON gem, JSON pure, or a vendored version of okjson.}
  gem.email = ['michael@intridea.com', 'josh.kalderimis@gmail.com', 'sferik@gmail.com']
  gem.executables = `git ls-files -- bin/*`.split("\n").map{|f| File.basename(f)}
  gem.extra_rdoc_files = ['LICENSE.md', 'README.md']
  gem.files = `git ls-files`.split("\n")
  gem.homepage = 'http://github.com/intridea/multi_json'
  gem.name = 'multi_json'
  gem.rdoc_options = ["--charset=UTF-8"]
  gem.require_paths = ['lib']
  gem.required_rubygems_version = Gem::Requirement.new(">= 1.3.6")
  gem.summary = %q{A gem to provide swappable JSON backends.}
  gem.test_files = `git ls-files -- {test,spec,features}/*`.split("\n")
  gem.version = MultiJson::VERSION
end
