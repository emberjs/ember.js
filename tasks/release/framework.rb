namespace :release do
  namespace :framework do
    desc "Update repo"
    task :update do
      puts "Making sure repo is up to date..."
      system %|git pull| unless pretend?
    end

    desc "Update Changelog"
    task :changelog do
      last_tag = system %|git describe --tags --abbrev=0|.strip
      puts "Getting Changes since #{last_tag}"

      cmd = "git log #{last_tag}..HEAD --format='* %s'"
      puts cmd

      changes = system cmd
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
        system %|git reset|
        system %|git add VERSION CHANGELOG packages/ember-metal/lib/core.js ember.json packages/**/package.json|
        system %|git commit -m 'Version bump - #{EMBER_VERSION}'|
      end
    end

    desc "Tag new version"
    task :tag do
      puts "Tagging v#{EMBER_VERSION}"
      system %|git tag v#{EMBER_VERSION}| unless pretend?
    end

    desc "Push new commit to git"
    task :push do
      puts "Pushing Repo"
      unless pretend?
        print "Are you sure you want to push the ember.js repo to github? (y/N) "
        res = STDIN.gets.chomp
        if res == 'y'
          system %|git push|
          system %|git push --tags|
        else
          puts "Not Pushing"
        end
      end
    end

    desc "Prepare for a new release"
    task :prepare => [:update, :changelog, :bump_version]

    desc "Commit the new release"
    task :deploy => [:commit, :tag, :push, "distribute:release"]
  end
end
