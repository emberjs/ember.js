namespace :release do
  namespace :examples do
    ember_min_output = "tmp/examples/lib/ember.min.js"

    task :pull => "tmp/examples" do
      Dir.chdir("tmp/examples") do
        system %|git pull origin master|
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
        system %|git clone https://github.com/emberjs/examples.git|
      end
    end

    file ember_min_output => [:clean, "tmp/examples", "dist/ember.min.js"] do
      system %|cp dist/ember.min.js #{ember_min_output}|
    end

    desc "Update examples repo"
    task :update => ember_min_output do
      puts "Updating examples repo"
      unless pretend?
        Dir.chdir("tmp/examples") do
          system %|git add -A|
          system %|git commit -m 'Updated to #{EMBER_VERSION}'|

          print "Are you sure you want to push the examples repo to github? (y/N) "
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

    desc "Prepare examples for release"
    task :prepare => []

    desc "Update examples repo"
    task :deploy => [:update]
  end
end
