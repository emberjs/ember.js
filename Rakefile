abort "Please use Ruby 1.9 to build Ember.js!" if RUBY_VERSION !~ /^1\.9/

require "bundler/setup"
require "erb"
require 'rake-pipeline'
require "ember_docs/cli"
require "colored"

def pipeline
  Rake::Pipeline::Project.new("Assetfile")
end

desc "Strip trailing whitespace for JavaScript files in packages"
task :strip_whitespace do
  Dir["packages/**/*.js"].each do |name|
    body = File.read(name)
    File.open(name, "w") do |file|
      file.write body.gsub(/ +\n/, "\n")
    end
  end
end

desc "Build ember.js"
task :dist do
  puts "Building Ember..."
  pipeline.invoke
  puts "Done"
end

desc "Clean build artifacts from previous builds"
task :clean do
  puts "Cleaning build..."
  pipeline.clean
  puts "Done"
end

namespace :upload do

  def get_oauth_token(login)
    require "rest-client"

    token = nil

    if !File.exists?(".github-upload-token")
      puts "There is no file named .github-upload-token in this folder. This file holds the OAuth token needed to communicate with GitHub."
      puts "You will be asked to enter your GitHub password so a new OAuth token will be created."
      print "GitHub Password: "
      system "stty -echo" # disable echoing of entered chars so password is not shown on console
      pw = STDIN.gets.chomp
      system "stty echo" # enable echoing of entered chars
      puts ""

      # check if the user already granted access for Ember.js Uploader by checking the available authorizations
      response = RestClient.get "https://#{login}:#{pw}@api.github.com/authorizations"
      JSON.parse(response.to_str).each do |auth|
        if auth["note"] == "Ember.js Uploader"
          # user already granted access, so we reuse the existing token
          token = auth["token"]
        end
      end

      ## we need to create a new token
      if (token == nil)
        payload = {
          :scopes => ["public_repo"],
          :note => "Ember.js Uploader",
          :note_url => "https://github.com/emberjs/ember.js"
        }
        response = RestClient.post "https://#{login}:#{pw}@api.github.com/authorizations", payload.to_json, :content_type => :json
        token = JSON.parse(response.to_str)["token"]
      end

      # finally save the token into .github-upload-token
      File.open(".github-upload-token", 'w') {|f| f.write(token)}
    else
      # if the file already exists, get the token from it
      token = File.open(".github-upload-token", "rb").read
    end

    return token
  end

  def upload_file(login, username, repo, filename, description, file)
    require "github_api"
    # We can stop requiring nokogiri when github_api is updated
    # # We can stop requiring nokogiri when github_api is updated
    require "nokogiri"

    token = get_oauth_token(login)
    gh = Github.new :user => username, :repo => repo, :oauth_token => token

    # remvove previous download with the same name
    gh.repos.downloads do |download|
      if filename == download.name
        gh.repos.delete_download login, repo, download.id
      end
    end

    # step 1
    hash = gh.repos.create_download username, repo,
      "name" => filename,
      "size" => File.size(file),
      "description" => description,
      "content_type" => "application/json"

    # step 2
    gh.repos.upload hash, file

    puts "uploaded file #{filename}"
  end

  ### UPLOAD LATEST EMBERJS BUILD TASK ###
  desc "Upload latest Ember.js build to GitHub repository"
  task :latest => :dist do

    # get the github user name
    login = `git config github.user`.chomp

    # get repo from git config's origin url
    origin = `git config remote.origin.url`.chomp # url to origin
    # extract USERNAME/REPO_NAME
    # sample urls: https://github.com/emberjs/ember.js.git
    #              git://github.com/emberjs/ember.js.git
    #              git@github.com:emberjs/ember.js.git
    #              git@github.com:emberjs/ember.js

    repoUrl = origin.match(/github\.com[\/:]((.+?)\/(.+?))(\.git)?$/)
    username = repoUrl[2] # username part of origin url
    repo = repoUrl[3] # repository name part of origin url

    upload_file login, username, repo, 'ember-latest.js', "Ember.js Master", "dist/ember.js"
    upload_file login, username, repo, 'ember-latest.min.js', "Ember.js Master (minified)", "dist/ember.min.js"

  end
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

  desc "Preview Ember Docs (does not auto update)"
  task :preview do
    EmberDocs::CLI.start("preview #{doc_args}".split(' '))
  end

  desc "Build Ember Docs"
  task :build do
    EmberDocs::CLI.start("generate #{doc_args} -o docs".split(' '))
  end

  desc "Remove Ember Docs"
  task :clean do
    rm_r "docs"
  end
end

desc "Run tests with phantomjs"
task :test, [:suite] => :dist do |t, args|
  unless system("which phantomjs > /dev/null 2>&1")
    abort "PhantomJS is not installed. Download from http://phantomjs.org"
  end

  packages = Dir['packages/*/tests'].map{|p| p.split('/')[1] }

  suites = {
    :default => packages.map{|p| "package=#{p}" },
    # testing older jQuery 1.6.4 for compatibility
    :all => packages.map{|p| "package=#{p}" } +
            ["package=all&jquery=1.6.4&nojshint=true",
             "package=all&jquery=git&nojshint=true",
              "package=all&extendprototypes=true&nojshint=true",
              "package=all&extendprototypes=true&jquery=1.6.4&nojshint=true",
              "package=all&extendprototypes=true&jquery=git&nojshint=true",
              "package=all&dist=build&nojshint=true"]
  }

  if ENV['TEST']
    opts = [ENV['TEST']]
  else
    suite = args[:suite] || :default
    opts = suites[suite.to_sym]
  end

  unless opts
    abort "No suite named: #{suite}"
  end

  cmd = opts.map do |opt|
    "phantomjs tests/qunit/run-qunit.js \"file://localhost#{File.dirname(__FILE__)}/tests/index.html?#{opt}\""
  end.join(' && ')

  # Run the tests
  puts "Running: #{opts.join(", ")}"
  success = system(cmd)

  if success
    puts "Tests Passed".green
  else
    puts "Tests Failed".red
    exit(1)
  end
end

desc "Automatically run tests (Mac OS X only)"
task :autotest do
  system("kicker -e 'rake test' packages")
end

task :default => :dist
