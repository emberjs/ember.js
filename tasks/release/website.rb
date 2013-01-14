namespace :release do
  namespace :website do

    file "tmp/website" do
      mkdir_p "tmp"

      Dir.chdir("tmp") do
        system %|git clone https://github.com/emberjs/website.git|
      end
    end

    task :pull => "tmp/website" do
      Dir.chdir("tmp/website") do
        system %|git pull origin master|
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
          system %|git add -A|
          system %|git commit -m 'Updated to #{EMBER_VERSION}'|

          print "Are you sure you want to push the website repo to github? (y/N) "
          res = STDIN.gets.chomp
          if res == 'y'
            system %|git push origin master|
            system %|git push --tags|
          else
            puts "Not pushing"
          end
        end
        puts "NOTE: You still need to run |rake deploy| from within the website repo."
      end
    end

    desc "Prepare website for release"
    task :prepare => []

    desc "Update website repo"
    task :deploy => [:update]
  end
end
