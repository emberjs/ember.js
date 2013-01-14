require "colored"

desc "Run tests with phantomjs"
task :test, [:suite] => :dist do |t, args|
  unless system("which phantomjs > /dev/null 2>&1")
    abort "PhantomJS is not installed. Download from http://phantomjs.org"
  end

  packages = Dir['packages/*/tests'].sort.map { |p| p.split('/')[1] }

  suites = {
    :default  => packages.map{|p| "package=#{p}" },
    :built    => [ "package=all&dist=build" ],
    :runtime  => [ "package=ember-metal,ember-runtime" ],
    :views    => [ "package=ember-views,ember-handlebars" ],
    :standard => packages.map{|p| "package=#{p}" } +
                  ["package=all&jquery=1.7.2&nojshint=true",
                    "package=all&extendprototypes=true&nojshint=true",
                    "package=all&dist=build&nojshint=true"],
    :all      => packages.map{|p| "package=#{p}" } +
                  ["package=all&jquery=1.7.2&nojshint=true",
                    "package=all&jquery=git&nojshint=true",
                    "package=all&extendprototypes=true&nojshint=true",
                    "package=all&extendprototypes=true&jquery=git&nojshint=true",
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
    puts "\n"

    cmd = "phantomjs tests/qunit/run-qunit.js \"file://localhost#{File.dirname(__FILE__)}/tests/index.html?#{opt}\""
    system(cmd)

    # A bit of a hack until we can figure this out on Travis
    tries = 0
    while tries < 3 && $?.exitstatus === 124
      tries += 1
      puts "\nTimed Out. Trying again...\n"
      system(cmd)
    end

    success &&= $?.success?
  end

  if success
    puts "\nTests Passed".green
  else
    puts "\nTests Failed".red
    exit(1)
  end
end

desc "Automatically run tests (Mac OS X only)"
task :autotest do
  system("kicker -e 'rake test' packages")
end
