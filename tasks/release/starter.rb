namespace :release do
  namespace :starter_kit do
    ember_output = "tmp/starter-kit/js/libs/ember-#{EMBER_VERSION}.js"
    ember_min_output = "tmp/starter-kit/js/libs/ember-#{EMBER_VERSION}.min.js"

    task :pull => "tmp/starter-kit" do
      Dir.chdir("tmp/starter-kit") do
        system %|git pull origin master|
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
        system %|zip -r ../dist/starter-kit.#{EMBER_VERSION}.zip starter-kit -x "starter-kit/.git/*"|
      end
    end

    file ember_output => [:clean, "tmp/starter-kit", "dist/ember.js"] do
      system %|cp dist/ember.js #{ember_output}|
    end

    file ember_min_output => [:clean, "tmp/starter-kit", "dist/ember.min.js"] do
      system %|cp dist/ember.min.js #{ember_min_output}|
    end

    file "tmp/starter-kit" do
      mkdir_p "tmp"

      Dir.chdir("tmp") do
        system %|git clone https://github.com/emberjs/starter-kit.git|
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
          system %|git add -A|
          system %|git commit -m 'Updated to #{EMBER_VERSION}'|
          system %|git tag v#{EMBER_VERSION}|

          print "Are you sure you want to push the starter-kit repo to github? (y/N) "
          res = STDIN.gets.chomp
          if res == 'y'
            system %|git push origin master|
            system %|git push --tags|
          else
            puts "Not pushing"
          end
        end
      end
    end

    # desc "Upload release"
    # task :upload do
    #   uploader = setup_uploader("tmp/starter-kit")

    #   # Upload minified first, so non-minified shows up on top
    #   upload_file(uploader, "starter-kit.#{EMBER_VERSION}.zip", "Ember.js #{EMBER_VERSION} Starter Kit", "dist/starter-kit.#{EMBER_VERSION}.zip")
    # end

    desc "Build the Ember.js starter kit"
    task :build => "dist/starter-kit.#{EMBER_VERSION}.zip"

    desc "Prepare starter-kit for release"
    task :prepare => []

    desc "Release starter-kit"
    task :deploy => [:build, :update, :upload]
  end
end
