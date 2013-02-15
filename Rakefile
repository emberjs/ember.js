require "bundler/setup"
require "ember-dev/tasks"

### RELEASE TASKS ###

EMBER_VERSION = File.read("VERSION").strip

namespace :release do

  def pretend?
    ENV['PRETEND']
  end

  namespace :starter_kit do
    ember_output = "tmp/starter-kit/js/libs/ember-#{EMBER_VERSION}.js"
    ember_min_output = "tmp/starter-kit/js/libs/ember-#{EMBER_VERSION}.min.js"

    task :pull => "tmp/starter-kit" do
      Dir.chdir("tmp/starter-kit") do
        sh "git pull origin master"
      end
    end

    task :clean => :pull do
      Dir.chdir("tmp/starter-kit") do
        rm_rf Dir["js/libs/ember*.js"]
      end
    end

    file "dist/ember.js" => :dist
    file "dist/ember.min.js" => :dist

    task "dist/starter-kit.#{EMBER_VERSION}.zip" => ["tmp/starter-kit/index.html"] do
      mkdir_p "dist"

      Dir.chdir("tmp") do
        sh %{zip -r ../dist/starter-kit.#{EMBER_VERSION}.zip starter-kit -x "starter-kit/.git/*"}
      end
    end

    file ember_output => [:clean, "tmp/starter-kit", "dist/ember.js"] do
      sh "cp dist/ember.js #{ember_output}"
    end

    file ember_min_output => [:clean, "tmp/starter-kit", "dist/ember.min.js"] do
      sh "cp dist/ember.min.js #{ember_min_output}"
    end

    file "tmp/starter-kit" do
      mkdir_p "tmp"

      Dir.chdir("tmp") do
        sh "git clone https://github.com/emberjs/starter-kit.git"
      end
    end

    file "tmp/starter-kit/index.html" => [ember_output, ember_min_output] do
      index = File.read("tmp/starter-kit/index.html")
      index.gsub! %r{<script src="js/libs/ember-\d\.\d.*</script>},
        %{<script src="js/libs/ember-#{EMBER_VERSION}.min.js"></script>}

      File.open("tmp/starter-kit/index.html", "w") { |f| f.write index }
    end

    task :index => "tmp/starter-kit/index.html"

    desc "Update starter-kit repo"
    task :update => :index do
      puts "Updating starter-kit repo"
      unless pretend?
        Dir.chdir("tmp/starter-kit") do
          sh "git add -A"
          sh "git commit -m 'Updated to #{EMBER_VERSION}'"
          sh "git tag v#{EMBER_VERSION}"

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

    desc "Upload release"
    task :upload do
      uploader = setup_uploader("tmp/starter-kit")

      # Upload minified first, so non-minified shows up on top
      upload_file(uploader, "starter-kit.#{EMBER_VERSION}.zip", "Ember.js #{EMBER_VERSION} Starter Kit", "dist/starter-kit.#{EMBER_VERSION}.zip")
    end

    desc "Build the Ember.js starter kit"
    task :build => "dist/starter-kit.#{EMBER_VERSION}.zip"

    desc "Prepare starter-kit for release"
    task :prepare => []

    desc "Release starter-kit"
    task :deploy => [:build, :update, :upload]
  end

  namespace :examples do
    ember_min_output = "tmp/examples/lib/ember.min.js"

    task :pull => "tmp/examples" do
      Dir.chdir("tmp/examples") do
        sh "git pull origin master"
      end
    end

    task :clean => :pull do
      Dir.chdir("tmp/examples") do
        rm_rf Dir["lib/ember.min.js"]
      end
    end

    file "tmp/examples" do
      mkdir_p "tmp"

      Dir.chdir("tmp") do
        sh "git clone https://github.com/emberjs/examples.git"
      end
    end

    file ember_min_output => [:clean, "tmp/examples", "dist/ember.min.js"] do
      sh "cp dist/ember.min.js #{ember_min_output}"
    end

    desc "Update examples repo"
    task :update => ember_min_output do
      puts "Updating examples repo"
      unless pretend?
        Dir.chdir("tmp/examples") do
          sh "git add -A"
          sh "git commit -m 'Updated to #{EMBER_VERSION}'"

          print "Are you sure you want to push the examples repo to github? (y/N) "
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

    desc "Prepare examples for release"
    task :prepare => []

    desc "Update examples repo"
    task :deploy => [:update]
  end

  namespace :website do

    file "tmp/website" do
      mkdir_p "tmp"

      Dir.chdir("tmp") do
        sh "git clone https://github.com/emberjs/website.git"
      end
    end

    task :pull => "tmp/website" do
      Dir.chdir("tmp/website") do
        sh "git pull origin master"
      end
    end

    task :about => [:pull, :dist] do
      require 'zlib'

      about = File.read("tmp/website/source/about.html.erb")
      min_gz = Zlib::Deflate.deflate(File.read("dist/ember.min.js")).bytes.count / 1024

      about.gsub! %r{https://raw\.github\.com/emberjs/ember\.js/release-builds/ember-\d(?:[\.-](?:(?:\d+)|pre))*?(\.min)?\.js},
        %{https://raw.github.com/emberjs/ember.js/release-builds/ember-#{EMBER_VERSION}\\1.js}

      about.gsub!(/Ember \d([\.-]((\d+)|pre))*/, "Ember #{EMBER_VERSION}")

      about.gsub!(/\d+k min\+gzip/, "#{min_gz}k min+gzip")

      File.open("tmp/website/source/about.html.erb", "w") { |f| f.write about }
    end

    desc "Update website repo"
    task :update => :about do
      puts "Updating website repo"
      unless pretend?
        Dir.chdir("tmp/website") do
          sh "git add -A"
          sh "git commit -m 'Updated to #{EMBER_VERSION}'"

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
    task :prepare => []

    desc "Update website repo"
    task :deploy => [:update]
  end

  desc "Prepare Ember for new release"
  task :prepare => ['ember:clean', 'ember:release:prepare', 'website:prepare']

  desc "Deploy a new Ember release"
  task :deploy => ['ember:release:deploy', 'website:deploy']
end

task :clean => "ember:clean"
task :dist => "ember:dist"
task :test, [:suite] => "ember:test"
task :default => "ember:test"
