abort "Please use Ruby 1.9 to build Ember.js!" if RUBY_VERSION !~ /^1\.9/

require "bundler/setup"

def pipeline
  require 'rake-pipeline'
  Rake::Pipeline::Project.new("Assetfile")
end

def setup_uploader(root=Dir.pwd)
  require 'github_downloads'
  uploader = nil
  Dir.chdir(root) do
    uploader = GithubDownloads::Uploader.new
    uploader.authorize
  end
  uploader
end

def upload_file(uploader, filename, description, file)
  print "Uploading #{filename}..."
  if uploader.upload_file(filename, description, file)
    puts "Success"
  else
    puts "Failure"
  end
end

def docs_upload_task(name)
  instance_eval <<-end_eval
    namespace :upload do
      file "tmp/#{name}" do
        mkdir_p "tmp"

        Dir.chdir("tmp") do
          sh "git clone git@heroku.com:#{name}.git"
        end
      end

      task :pull => "tmp/#{name}" do
        Dir.chdir("tmp/#{name}") do
          sh "git pull origin master"
        end
      end

      task :clean => :pull do
        rm_rf "tmp/#{name}/html"
      end

      file "tmp/#{name}/html" => ['docs:build', :clean] do
        cp_r "docs", "tmp/#{name}/html"
      end

      task :run => "tmp/#{name}/html" do
        Dir.chdir "tmp/#{name}" do
          sh "git add -A html && git commit -m 'Upload generated API docs' && git push origin master"
        end
      end
    end

    desc "Upload docs to #{name}"
    task :upload => 'upload:run'
  end_eval
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
  rm_rf "dist" # Make sure even things RakeP doesn't know about are cleaned
  rm_f "tests/ember-tests.js"
  rm_rf "tmp"
  puts "Done"
end

desc "Upload latest Ember.js build to GitHub repository"
task :upload_latest => [:clean, :dist] do
  uploader = setup_uploader

  # Upload minified first, so non-minified shows up on top
  upload_file(uploader, 'ember-latest.min.js', "Ember.js Master (minified)", "dist/ember.min.js")
  upload_file(uploader, 'ember-latest.js', "Ember.js Master", "dist/ember.js")
end

namespace :docs do
  def doc_args
    "#{Dir.glob("packages/ember-*").join(' ')} -E #{Dir.glob("packages/ember-*/tests").join(' ')} -t docs.emberjs.com"
  end

  desc "Preview Ember Docs (does not auto update)"
  task :preview do
    require "ember_docs/cli"
    EmberDocs::CLI.start("preview #{doc_args}".split(' '))
  end

  desc "Build Ember Docs"
  task :build do
    require "ember_docs/cli"
    EmberDocs::CLI.start("generate #{doc_args} -o docs".split(' '))
  end

  docs_upload_task("ember-edge-docs")

  desc "Remove Ember Docs"
  task :clean do
    rm_r "docs"
  end
end

desc "Run tests with phantomjs"
task :test, [:suite] => :dist do |t, args|
  require "colored"

  unless system("which phantomjs > /dev/null 2>&1")
    abort "PhantomJS is not installed. Download from http://phantomjs.org"
  end

  packages = Dir['packages/*/tests'].sort.map { |p| p.split('/')[1] }

  suites = {
    :default => packages.map{|p| "package=#{p}" },
    :runtime => [ "package=ember-metal,ember-runtime" ],
    :all => packages.map{|p| "package=#{p}" } +
            ["package=all&jquery=1.7.2&nojshint=true",
              "package=all&jquery=git&nojshint=true",
              "package=all&extendprototypes=true&nojshint=true",
              "package=all&extendprototypes=true&jquery=git&nojshint=true",
              "package=all&nocpdefaultcacheable=true&nojshint=true",
              "package=all&noviewpreservescontext=true&nojshint=true",
              "package=all&dist=build&nojshint=true"]
  }

  packages.each do |package|
    suites[package.to_sym] = ["package=#{package}"]
  end

  if ENV['TEST']
    opts = [ENV['TEST']]
  else
    suite = args[:suite] || :default
    opts = suites[suite.to_sym]
  end

  unless opts
    abort "No suite named: #{suite}"
  end

  success = true
  opts.each do |opt|
    cmd = "phantomjs tests/qunit/run-qunit.js \"file://localhost#{File.dirname(__FILE__)}/tests/index.html?#{opt}\""
    system(cmd)

    # A bit of a hack until we can figure this out on Travis
    tries = 0
    while tries < 3 && $?.exitstatus === 124
      tries += 1
      puts "Timed Out. Trying again..."
      system(cmd)
    end

    success &&= $?.success?
  end

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

    desc "Upload release"
    task :upload do
      uploader = setup_uploader

      # Upload minified first, so non-minified shows up on top
      upload_file(uploader, "ember-#{EMBER_VERSION}.min.js", "Ember.js #{EMBER_VERSION} (minified)", "dist/ember.min.js")
      upload_file(uploader, "ember-#{EMBER_VERSION}.js", "Ember.js #{EMBER_VERSION}", "dist/ember.js")
    end

    desc "Prepare for a new release"
    task :prepare => [:update, :changelog, :bump_version]

    desc "Commit the new release"
    task :deploy => [:commit, :tag, :push, :upload]
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
    task :prepare => [:build]

    desc "Release starter-kit"
    task :deploy => [:update, :upload]
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

    file "dist/ember.min.js" => :dist

    file "tmp/website/source/about.html.erb" => [:pull, "dist/ember.min.js"] do
      require 'zlib'

      about = File.read("tmp/website/source/about.html.erb")
      min_gz = Zlib::Deflate.deflate(File.read("dist/ember.min.js")).bytes.count / 1024

      about.gsub! %r{https://github\.com/downloads/emberjs/ember\.js/ember-\d(?:\.(?:(?:\d+)|pre))*?(\.min)?\.js},
        %{https://github.com/downloads/emberjs/ember.js/ember-#{EMBER_VERSION}\\1.js}

      about.gsub! %r{https://github\.com/downloads/emberjs/starter-kit/starter-kit\.\d(\.((\d+)|pre))*?*\.zip},
        %{https://github.com/downloads/emberjs/starter-kit/starter-kit.#{EMBER_VERSION}.zip}

      about.gsub! /Ember \d(\.((\d+)|pre))*/, "Ember #{EMBER_VERSION}"

      about.gsub! /\d+k min\+gzip/, "#{min_gz}k min+gzip"

      File.open("tmp/website/source/about.html.erb", "w") { |f| f.write about }
    end

    task :about => "tmp/website/source/about.html.erb"

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

  namespace :docs do
    docs_upload_task("ember-docs")

    desc "Prepare docs for release"
    task :prepare => []

    desc "Deploy docs"
    task :deploy => [:upload]
  end

  desc "Prepare Ember for new release"
  task :prepare => [:clean, 'framework:prepare', 'starter_kit:prepare', 'examples:prepare', 'website:prepare', 'docs:prepare']

  desc "Deploy a new Ember release"
  task :deploy => ['framework:deploy', 'starter_kit:deploy', 'examples:deploy', 'website:deploy', 'docs:deploy']

end

task :default => :dist
