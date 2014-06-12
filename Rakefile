require 'bundler/setup'
require 'ember-dev/tasks'
require './lib/ember/version'
require 'zlib'
require 'fileutils'
require 'pathname'
require 'json'

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
        sh "git clone git@github.com:emberjs/starter-kit.git"
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
      about.gsub!(/min \+ gzip \d+kb/, "min + gzip  #{min_gz}kb")

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
    task :prepare => [:about]

    desc "Update website repo"
    task :deploy => [:update]
  end

  desc "Prepare Ember for new release"
  task :prepare => ['ember:clean', 'ember:release:prepare', 'starter_kit:prepare', 'website:prepare']

  desc "Deploy a new Ember release"
  task :deploy => ['ember:release:deploy', 'starter_kit:deploy', 'website:deploy']
end

def files_to_publish
  %w{ember.js ember-docs.json ember-tests.js ember-template-compiler.js ember-runtime.js}
end

task :publish_build => [:docs] do
  root_dir = Pathname.new(__FILE__).dirname
  dist_dir = root_dir.join('dist')

  FileUtils.cp root_dir.join('docs', 'build', 'data.json'),
               dist_dir.join('ember-docs.json')

  files = files_to_publish

  EmberDev::Publish.to_s3({
    :access_key_id => ENV['S3_ACCESS_KEY_ID'],
    :secret_access_key => ENV['S3_SECRET_ACCESS_KEY'],
    :bucket_name => ENV['S3_BUCKET_NAME'],

    :files => files.map { |f| dist_dir.join(f) }
  })
end

def setup_private_key
  sh "openssl aes-256-cbc -k $DEPLOY_PASSWORD -in bin/id_private.enc -d -a -out bin/id_private"
  sh "chmod 600 bin/id_private"
end

#task :publish_to_bower => :dist do
task :publish_to_bower do
  ember_git_support = EmberDev::GitSupport.new '.', debug: false
  version = EmberDev::VersionCalculator.new(debug: false, git_support: ember_git_support).version

  channel = ENV['FORCE_CHANNEL'] || case ember_git_support.current_branch
  when 'stable','release' then 'release'
  when 'beta'             then 'beta'
  when 'master'           then 'canary'
  end

  next unless channel # quit if not building a known channel
  next unless ENV['DEPLOY_PASSWORD'] # quit if not running with secure vars

  setup_private_key

  rm_rf "publish_to_bower"
  mkdir_p "publish_to_bower"
  Dir.chdir "publish_to_bower" do
    unless File.exist?(".git")
      system "git init"
      system "git remote add origin git@github.com:components/ember.git"
    end

    system "GIT_SSH=../bin/git_wrapper git fetch origin"
    system "git reset --hard origin/master"
    system "git checkout #{channel}"

    package_manager_files = ['bower.json', 'component.json', 'composer.json', 'package.json']
    # Remove all files so we don't accidentally keep old stuff
    # These will be regenerated by the build process
    repo_files = `git ls-files`.split("\n")
    repo_files -= package_manager_files
    system "rm #{repo_files.join(' ')}"

    files_to_publish.each do |file|
      system "cp ../dist/#{file} ./"
    end

    package_manager_files.each do |file|
      hash = JSON.parse(File.read(file))
      hash['version'] = version
      File.write(file, JSON.pretty_generate(hash))
    end

    system 'ssh-add -D'
    system 'git config user.email "tomster@emberjs.com"'
    system 'git config user.name "Tomster"'
    system "git add -A"
    system "git commit -m 'Update for #{channel} SHA: https://github.com/emberjs/ember.js/commits/#{ember_git_support.current_revision}'"
    system "GIT_SSH=../bin/git_wrapper git push origin #{channel}" unless ENV['NODEPLOY']
  end
end

task :docs => "ember:docs"
