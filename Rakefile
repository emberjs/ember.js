require 'bundler/setup'
require 'ember-dev/tasks'
require './lib/ember/version'
require 'zlib'

### RELEASE TASKS ###

namespace :release do

  def pretend?
    ENV['PRETEND']
  end

  task :gem do
    sh "rakep"
    sh 'gem build ember-source.gemspec'
    sh "gem push ember-source-#{Ember::VERSION.gsub('-','.')}.gem"
  end

  namespace :starter_kit do
    ember_output = "tmp/starter-kit/js/libs/ember-#{Ember::VERSION}.js"

    task :pull => "tmp/starter-kit" do
      cd("tmp/starter-kit") do
        sh "git pull origin master"
      end
    end

    task :clean => :pull do
      cd("tmp/starter-kit") do
        rm_rf Dir["js/libs/ember*.js"]
      end
    end

    file "dist/ember.js" => :dist
    file "dist/ember.min.js" => :dist

    task "dist/starter-kit.#{Ember::VERSION}.zip" => ["tmp/starter-kit/index.html"] do
      mkdir_p "dist"

      cd("tmp") do
        sh %{zip -r ../dist/starter-kit.#{Ember::VERSION}.zip starter-kit -x "starter-kit/.git/*"}
      end
    end

    file ember_output => [:clean, "tmp/starter-kit", "dist/ember.js"] do
      sh "cp dist/ember.js #{ember_output}"
    end

    file "tmp/starter-kit" do
      mkdir_p "tmp"

      cd("tmp") do
        sh "git clone https://github.com/emberjs/starter-kit.git"
      end
    end

    file "tmp/starter-kit/index.html" => [ember_output] do
      index = File.read("tmp/starter-kit/index.html")
      index.gsub! %r{<script src="js/libs/ember-\d\.\d.*</script>},
        %{<script src="js/libs/ember-#{Ember::VERSION}.js"></script>}

      open("tmp/starter-kit/index.html", "w") { |f| f.write index }
    end

    task :index => "tmp/starter-kit/index.html"

    desc "Update starter-kit repo"
    task :update => :index do
      puts "Updating starter-kit repo"
      unless pretend?
        cd("tmp/starter-kit") do
          sh "git add -A"
          sh "git commit -m 'Updated to #{Ember::VERSION}'"
          sh "git tag v#{Ember::VERSION}"

          print "Are you sure you want to push the starter-kit repo to github? (y/N) "
          res = STDIN.gets.chomp
          if res == 'y'
            sh "git push origin master"
            sh "git push --tags"
          else
            puts "Not pushing"
          end
        end
      end
    end

    desc "Build the Ember.js starter kit"
    task :build => "dist/starter-kit.#{Ember::VERSION}.zip"

    desc "Prepare starter-kit for release"
    task :prepare => [:clean, :build]

    desc "Release starter-kit"
    task :deploy => [:build, :update]
  end

  namespace :website do
    file "tmp/website" do
      mkdir_p "tmp"

      cd("tmp") do
        sh "git clone https://github.com/emberjs/website.git"
      end
    end

    task :pull => "tmp/website" do
      cd("tmp/website") do
        sh "git pull origin master"
      end
    end

    task :about => [:pull, :dist] do
      about = File.read("tmp/website/source/about.html.erb")
      min_gz = Zlib::Deflate.deflate(File.read("dist/ember.min.js")).bytes.count / 1024

      about.gsub!(/(\d+\.\d+\.\d+-rc(?:\.?\d+)?)/, Ember::VERSION)
      about.gsub!(/\d+k min\+gzip/, "#{min_gz}k min+gzip")

      open("tmp/website/source/about.html.erb", "w") { |f| f.write about }
    end

    desc "Update website repo"
    task :update => :about do
      puts "Updating website repo"
      unless pretend?
        cd("tmp/website") do
          sh "git add -A"
          sh "git commit -m 'Updated to #{Ember::VERSION}'"

          print "Are you sure you want to push the website repo to github? (y/N) "
          res = STDIN.gets.chomp
          if res == 'y'
            sh "git push origin master"
            sh "git push --tags"
          else
            puts "Not pushing"
          end
        end
        puts "NOTE: You still need to run `rake deploy` from within the website repo."
      end
    end

    desc "Prepare website for release"
    task :prepare => [:update]

    desc "Update website repo"
    task :deploy => [:update]
  end

  desc "Prepare Ember for new release"
  task :prepare => ['ember:clean', 'ember:release:prepare', 'starter_kit:prepare', 'website:prepare']

  desc "Deploy a new Ember release"
  task :deploy => ['ember:release:deploy', 'starter_kit:deploy', 'website:deploy']
end

task :publish_build do
  root = File.dirname(__FILE__) + '/dist/'
  EmberDev::Publish.to_s3({
    :access_key_id => ENV['S3_ACCESS_KEY_ID'],
    :secret_access_key => ENV['S3_SECRET_ACCESS_KEY'],
    :bucket_name => ENV['S3_BUCKET_NAME'],
    :files => ['ember.js', 'ember-runtime.js'].map { |f| root + f }
  })
end

task :clean => "ember:clean"
task :dist => "ember:dist"
task :test, [:suite] => "ember:test"
task :default => "ember:test"
