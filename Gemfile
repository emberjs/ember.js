source "https://rubygems.org"

if ENV['HANDLEBARS_PATH']
  gem "handlebars-source", :path => File.join(ENV['HANDLEBARS_PATH'], "dist", "components")
end

gem "rake-pipeline", :git => "https://github.com/livingsocial/rake-pipeline.git"
gem "ember-dev", :git => "https://github.com/emberjs/ember-dev.git", :branch => "master"

# Require the specific version of handlebars-source that
# we'll be precompiling and performing tests with.
gemspec
