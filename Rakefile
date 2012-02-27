abort "Please use Ruby 1.9 to build Ember.js!" if RUBY_VERSION !~ /^1\.9/

require "rubygems"
require "net/github-upload"

require "bundler/setup"
require "erb"
require "uglifier"
require "ember_docs/cli"

desc "Strip trailing whitespace for JavaScript files in packages"
task :strip_whitespace do
  Dir["packages/**/*.js"].each do |name|
    body = File.read(name)
    File.open(name, "w") do |file|
      file.write body.gsub(/ +\n/, "\n")
    end
  end
end

# for now, the SproutCore compiler will be used to compile Ember.js
require "sproutcore"

LICENSE = File.read("generators/license.js")

## Some Ember modules expect an exports object to exist. Mock it out.

module SproutCore
  module Compiler
    class Entry
      def body
        "\n(function(exports) {\n#{@raw_body}\n})({});\n"
      end
    end
  end
end

## HELPERS ##

def strip_require(file)
  result = File.read(file)
  result.gsub!(%r{^\s*require\(['"]([^'"])*['"]\);?\s*}, "")
  result
end

def strip_dev_code(file)
  result = File.read(file)
  result.gsub!(%r{^(\s)+ember_(assert|deprecate|warn)\((.*)\).*$}, "")
  result
end

def uglify(file)
  uglified = Uglifier.compile(File.read(file))
  "#{LICENSE}\n#{uglified}"
end

# Set up the intermediate and output directories for the interim build process

SproutCore::Compiler.intermediate = "tmp/intermediate"
SproutCore::Compiler.output       = "tmp/static"

# Create a compile task for an Ember package. This task will compute
# dependencies and output a single JS file for a package.
def compile_package_task(input, output=input)
  js_tasks = SproutCore::Compiler::Preprocessors::JavaScriptTask.with_input "packages/#{input}/lib/**/*.js", "."
  SproutCore::Compiler::CombineTask.with_tasks js_tasks, "#{SproutCore::Compiler.intermediate}/#{output}"
end

## TASKS ##

# Create ember:package tasks for each of the Ember packages
namespace :ember do
  %w(debug metal runtime handlebars views states datetime).each do |package|
    task package => compile_package_task("ember-#{package}", "ember-#{package}")
  end
end

# Create a handlebars task
task :handlebars => compile_package_task("handlebars")

# Create a metamorph task
task :metamorph => compile_package_task("metamorph")

# Create a build task that depends on all of the package dependencies
task :build => ["ember:debug", "ember:metal", "ember:runtime", "ember:handlebars", "ember:views", "ember:states", "ember:datetime", :handlebars, :metamorph]

distributions = {
  "ember" => ["handlebars", "ember-metal", "ember-runtime", "ember-views", "ember-states", "metamorph", "ember-handlebars"],
  "ember-runtime" => ["ember-metal", "ember-runtime"]
}

distributions.each do |name, libraries|
  # Strip out require lines. For the interim, requires are
  # precomputed by the compiler so they are no longer necessary at runtime.
  file "tmp/dist/#{name}.js" => :build do
    mkdir_p "tmp/dist", :verbose => false
    File.open("tmp/dist/#{name}.js", "w") do |file|
      libraries.each do |library|
        file.puts strip_require("tmp/static/#{library}.js")
      end
    end
  end

  file "dist/#{name}.js" => "tmp/dist/#{name}.js" do
    puts "Generating #{name}.js... "
    mkdir_p "dist", :verbose => false
    File.open("dist/#{name}.js", "w") do |file|
      file.puts strip_require("tmp/static/ember-debug.js")
      file.puts File.read("tmp/dist/#{name}.js")
    end
  end

  # Minified distribution
  file "dist/#{name}.min.js" => "tmp/dist/#{name}.js" do
    require 'zlib'

    print "Generating #{name}.min.js... "
    STDOUT.flush

    mkdir_p "dist", :verbose => false
    File.open("dist/#{name}.prod.js", "w") do |file|
      file.puts strip_dev_code("tmp/dist/#{name}.js")
    end

    minified_code = uglify("dist/#{name}.prod.js")
    File.open("dist/#{name}.min.js", "w") do |file|
      file.puts minified_code
    end

    gzipped_kb = Zlib::Deflate.deflate(minified_code).bytes.count / 1024

    puts "#{gzipped_kb} KB gzipped"

    rm "dist/#{name}.prod.js", :verbose => false
  end
end


desc "Build Ember.js"
task :dist => distributions.keys.map{|name| ["dist/#{name}.js", "dist/#{name}.min.js"] }.flatten

desc "Clean build artifacts from previous builds"
task :clean do
  sh "rm -rf tmp && rm -rf dist"
end



### UPLOAD LATEST EMBERJS BUILD TASK ###
desc "Upload latest Ember.js build to GitHub repository"
task :upload => :dist do
  # setup
  login = `git config github.user`.chomp  # your login for github
  token = `git config github.token`.chomp # your token for github

  # get repo from git config's origin url
  origin = `git config remote.origin.url`.chomp # url to origin
  # extract USERNAME/REPO_NAME
  # sample urls: https://github.com/emberjs/ember.js.git
  #              git://github.com/emberjs/ember.js.git
  #              git@github.com:emberjs/ember.js.git
  #              git@github.com:emberjs/ember.js

  repo = origin.match(/github\.com[\/:](.+?)(\.git)?$/)[1]
  puts "Uploading to repository: " + repo

  gh = Net::GitHub::Upload.new(
    :login => login,
    :token => token
  )

  puts "Uploading ember-latest.js"
  gh.replace(
    :repos => repo,
    :file  => 'dist/ember.js',
    :name => 'ember-latest.js',
    :content_type => 'application/json',
    :description => "Ember.js Master"
  )

  puts "Uploading ember-latest.min.js"
  gh.replace(
    :repos => repo,
    :file  => 'dist/ember.min.js',
    :name => 'ember-latest.min.js',
    :content_type => 'application/json',
    :description => "Ember.js Master (minified)"
  )
end



### RELEASE TASKS ###

EMBER_VERSION = File.read("VERSION").strip

namespace :release do

  def pretend?
    ENV['PRETEND']
  end

  namespace :framework do
    desc "Update repo"
    task :update do
      puts "Making sure repo is up to date..."
      system "git pull" unless pretend?
    end

    desc "Update Changelog"
    task :changelog do
      last_tag = `git describe --tags --abbrev=0`.strip
      puts "Getting Changes since #{last_tag}"

      cmd = "git log #{last_tag}..HEAD --format='* %s'"
      puts cmd

      changes = `#{cmd}`
      output = "*Ember #{EMBER_VERSION} (#{Time.now.strftime("%B %d, %Y")})*\n\n#{changes}\n"

      unless pretend?
        File.open('CHANGELOG', 'r+') do |file|
          current = file.read
          file.pos = 0;
          file.puts output
          file.puts current
        end
      else
        puts output.split("\n").map!{|s| "    #{s}"}.join("\n")
      end
    end

    desc "bump the version to the one specified in the VERSION file"
    task :bump_version, :version do
      puts "Bumping to version: #{EMBER_VERSION}"

      unless pretend?
        # Bump the version of each component package
        Dir["packages/ember*/package.json", "ember.json"].each do |package|
          contents = File.read(package)
          contents.gsub! %r{"version": .*$}, %{"version": "#{EMBER_VERSION}",}
          contents.gsub! %r{"(ember[\w-]*)": [^,\n]+(,)?$} do
            %{"#{$1}": "#{EMBER_VERSION}"#{$2}}
          end

          File.open(package, "w") { |file| file.write contents }
        end

        # Bump ember-metal/core version
        contents = File.read("packages/ember-metal/lib/core.js")
        current_version = contents.match(/@version ([\w\.]+)/) && $1
        contents.gsub!(current_version, EMBER_VERSION);

        File.open("packages/ember-metal/lib/core.js", "w") do |file|
          file.write contents
        end
      end
    end

    desc "Commit framework version bump"
    task :commit do
      puts "Commiting Version Bump"
      unless pretend?
        sh "git reset"
        sh %{git add VERSION CHANGELOG packages/ember-metal/lib/core.js ember.json packages/**/package.json}
        sh "git commit -m 'Version bump - #{EMBER_VERSION}'"
      end
    end

    desc "Tag new version"
    task :tag do
      puts "Tagging v#{EMBER_VERSION}"
      system "git tag v#{EMBER_VERSION}" unless pretend?
    end

    desc "Push new commit to git"
    task :push do
      puts "Pushing Repo"
      unless pretend?
        print "Are you sure you want to push the ember.js repo to github? (y/N) "
        res = STDIN.gets.chomp
        if res == 'y'
          system "git push"
          system "git push --tags"
        else
          puts "Not Pushing"
        end
      end
    end

    desc "Prepare for a new release"
    task :prepare => [:update, :changelog, :bump_version]

    desc "Commit the new release"
    task :deploy => [:commit, :tag, :push]
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
        sh "git clone git@github.com:emberjs/starter-kit.git"
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

    desc "Build the Ember.js starter kit"
    task :build => "dist/starter-kit.#{EMBER_VERSION}.zip"

    desc "Prepare starter-kit for release"
    task :prepare => [:build]

    desc "Release starter-kit"
    task :deploy => [:update]
  end

  desc "Prepare Ember for new release"
  task :prepare => ['framework:prepare', 'starter_kit:prepare']

  desc "Deploy a new Ember release"
  task :deploy => ['framework:deploy', 'starter_kit:deploy']

end

namespace :docs do
  def doc_args
    "#{Dir.glob("packages/ember-*").join(' ')} -E #{Dir.glob("packages/ember-*/tests").join(' ')} -t docs.emberjs.com"
  end

  task :preview do
    EmberDocs::CLI.start("preview #{doc_args}".split(' '))
  end

  task :build do
    EmberDocs::CLI.start("generate #{doc_args} -o docs".split(' '))
  end

  task :clean do
    rm_r "docs"
  end
end

task :default => :dist
