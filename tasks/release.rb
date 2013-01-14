require_relative 'release/examples'
require_relative 'release/framework'
require_relative 'release/starter'
require_relative 'release/website'

namespace :release do
  desc "Prepare Ember for new release"
  task :prepare => ["distribute:clean", 'framework:prepare', 'starter_kit:prepare', 'examples:prepare', 'website:prepare']

  desc "Deploy a new Ember release"
  task :deploy => ['framework:deploy', 'starter_kit:deploy', 'examples:deploy', 'website:deploy']
end
