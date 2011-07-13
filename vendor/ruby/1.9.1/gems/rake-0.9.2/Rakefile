# Rakefile for rake        -*- ruby -*-

# Copyright 2003, 2004, 2005 by Jim Weirich (jim@weirichhouse.org)
# All rights reserved.

# This file may be distributed under an MIT style license.  See
# MIT-LICENSE for details.

require 'rbconfig'
require 'rubygems'

system_rake = File.join RbConfig::CONFIG['rubylibdir'], 'rake.rb'

# Use our rake, not the installed rake from system
if $".include? system_rake then
  exec Gem.ruby, '-Ilib', 'bin/rake', *ARGV
end

require 'rubygems/package_task'

require 'rake/clean'
require 'rake/testtask'

begin
  gem 'rdoc'
  require 'rdoc/task'
rescue Gem::LoadError
end

CLEAN.include('**/*.o', '*.dot', '**/*.rbc')
CLOBBER.include('doc/example/main', 'testdata')
CLOBBER.include('test/data/**/temp_*')
CLOBBER.include('test/data/chains/play.*')
CLOBBER.include('test/data/file_creation_task/build')
CLOBBER.include('test/data/file_creation_task/src')
CLOBBER.include('TAGS')
CLOBBER.include('coverage', 'rcov_aggregate')

# Prevent OS X from including extended attribute junk in the tar output
ENV['COPY_EXTENDED_ATTRIBUTES_DISABLE'] = 'true'

def announce(msg='')
  STDERR.puts msg
end

# Determine the current version of the software

if `ruby -Ilib ./bin/rake --version` =~ /rake, version ([0-9a-z.]+)$/
  CURRENT_VERSION = $1
else
  CURRENT_VERSION = "0.0.0"
end

$package_version = CURRENT_VERSION

SRC_RB = FileList['lib/**/*.rb']

# The default task is run if rake is given no explicit arguments.

desc "Default Task"
task :default => :test

# Test Tasks ---------------------------------------------------------

Rake::TestTask.new do |t|
  files = FileList['test/helper.rb', 'test/test_*.rb']
  t.test_files = files
  t.libs << "."
  t.warning = true
end

begin
  require 'rcov/rcovtask'
  IGNORE_COVERAGE_IN = FileList[
    'lib/rake/rdoctask.rb',
    'lib/rake/testtask.rb',
    'lib/rake/packagetask.rb',
    'lib/rake/clean.rb',
  ]

  unless File::ALT_SEPARATOR
    IGNORE_COVERAGE_IN.include(
      'lib/rake/alt_system.rb',
      'lib/rake/win32.rb')
  end

  Rcov::RcovTask.new do |t|
    t.libs << "test"
    t.rcov_opts = [
      '-xRakefile', '-xrakefile', '-xpublish.rf',
      '-xlib/rake/contrib', '-x/Library', '-x.rvm',
      '--text-report',
      '--sort coverage'
    ] + FileList['rakelib/*.rake'].pathmap("-x%p") +
      IGNORE_COVERAGE_IN.map { |fn| "-x#{fn}" }
    t.test_files = FileList[
      'test/lib/*_test.rb',
      'test/contrib/*_test.rb',
      'test/functional/*_test.rb'
    ]
    t.output_dir = 'coverage'
    t.verbose = true
  end
rescue LoadError
  task :rcov do
    puts "RCov is not available"
  end
end

directory 'testdata'
task :test => ['testdata']

# CVS Tasks ----------------------------------------------------------

# Install rake using the standard install.rb script.

desc "Install the application"
task :install do
  ruby "install.rb"
end

# Create a task to build the RDOC documentation tree.

BASE_RDOC_OPTIONS = [
  '--line-numbers', '--show-hash',
  '--main', 'README.rdoc',
  '--title', 'Rake -- Ruby Make'
]

if defined?(RDoc::Task) then
  RDoc::Task.new do |rdoc|
    rdoc.rdoc_dir = 'html'
    rdoc.title    = "Rake -- Ruby Make"
    rdoc.options = BASE_RDOC_OPTIONS.dup

    rdoc.rdoc_files.include('README.rdoc', 'MIT-LICENSE', 'TODO', 'CHANGES')
    rdoc.rdoc_files.include('lib/**/*.rb', 'doc/**/*.rdoc')
    rdoc.rdoc_files.exclude(/\bcontrib\b/)
  end
else
  warn "RDoc 2.4.2+ is required to build documentation"
end

# ====================================================================
# Create a task that will package the Rake software into distributable
# tar, zip and gem files.

PKG_FILES = FileList[
  '.gemtest',
  'install.rb',
  '[A-Z]*',
  'bin/**/*',
  'lib/**/*.rb',
  'test/**/*.rb',
  'test/**/*.rf',
  'test/**/*.mf',
  'test/**/Rakefile',
  'test/**/subdir',
  'doc/**/*'
]
PKG_FILES.exclude('doc/example/*.o')
PKG_FILES.exclude('TAGS')
PKG_FILES.exclude(%r{doc/example/main$})

if ! defined?(Gem)
  puts "Package Target requires RubyGEMs"
else
  SPEC = Gem::Specification.new do |s|

    #### Basic information.

    s.name = 'rake'
    s.version = $package_version
    s.summary = "Ruby based make-like utility."
    s.description = <<-EOF
      Rake is a Make-like program implemented in Ruby. Tasks
      and dependencies are specified in standard Ruby syntax.
    EOF

    #### Dependencies and requirements.

    s.required_rubygems_version = '>= 1.3.2'
    s.add_development_dependency 'minitest', '~> 2.1'
    s.add_development_dependency 'session', '~> 2.4'
    s.add_development_dependency 'flexmock', '~> 0.8.11'

    #### Which files are to be included in this gem?  Everything!  (Except CVS directories.)

    s.files = PKG_FILES.to_a

    #### C code extensions.

    #s.extensions << "ext/rmagic/extconf.rb"

    #### Load-time details: library and application (you will need one or both).

    s.require_path = 'lib'                         # Use these for libraries.

    s.bindir = "bin"                               # Use these for applications.
    s.executables = ["rake"]

    #### Documentation and testing.

    s.extra_rdoc_files = FileList[
      'README.rdoc',
      'MIT-LICENSE',
      'TODO',
      'CHANGES',
      'doc/**/*.rdoc'
    ]

    s.rdoc_options = BASE_RDOC_OPTIONS

    #### Author and project details.

    s.author = "Jim Weirich"
    s.email = "jim@weirichhouse.org"
    s.homepage = "http://rake.rubyforge.org"
    s.rubyforge_project = "rake"
#     if ENV['CERT_DIR']
#       s.signing_key = File.join(ENV['CERT_DIR'], 'gem-private_key.pem')
#       s.cert_chain  = [File.join(ENV['CERT_DIR'], 'gem-public_cert.pem')]
#     end
  end

  Gem::PackageTask.new(SPEC) do |pkg|
    pkg.need_zip = true
    pkg.need_tar = true
  end

  file "rake.gemspec" => ["Rakefile", "lib/rake.rb"] do |t|
    require 'yaml'
    open(t.name, "w") { |f| f.puts SPEC.to_yaml }
  end

  desc "Create a stand-alone gemspec"
  task :gemspec => "rake.gemspec"
end

# Misc tasks =========================================================

def count_lines(filename)
  lines = 0
  codelines = 0
  open(filename) { |f|
    f.each do |line|
      lines += 1
      next if line =~ /^\s*$/
      next if line =~ /^\s*#/
      codelines += 1
    end
  }
  [lines, codelines]
end

def show_line(msg, lines, loc)
  printf "%6s %6s   %s\n", lines.to_s, loc.to_s, msg
end

desc "Count lines in the main rake file"
task :lines do
  total_lines = 0
  total_code = 0
  show_line("File Name", "LINES", "LOC")
  SRC_RB.each do |fn|
    lines, codelines = count_lines(fn)
    show_line(fn, lines, codelines)
    total_lines += lines
    total_code  += codelines
  end
  show_line("TOTAL", total_lines, total_code)
end

# Define an optional publish target in an external file.  If the
# publish.rf file is not found, the publish targets won't be defined.

load "publish.rf" if File.exist? "publish.rf"

# Support Tasks ------------------------------------------------------

RUBY_FILES = FileList['**/*.rb'].exclude('pkg')

desc "Look for TODO and FIXME tags in the code"
task :todo do
  RUBY_FILES.egrep(/#.*(FIXME|TODO|TBD)/)
end

desc "List all ruby files"
task :rubyfiles do
  puts RUBY_FILES
  puts FileList['bin/*'].exclude('bin/*.rb')
end
task :rf => :rubyfiles

# --------------------------------------------------------------------
# Creating a release

def plugin(plugin_name)
  require "rake/plugins/#{plugin_name}"
end

task :noop
#plugin "release_manager"

desc "Make a new release"
task :release, [:rel, :reuse, :reltest] => [
    :prerelease,
    :clobber,
    :test,
    :update_version,
    :package,
    :tag
  ] do
  announce
  announce "**************************************************************"
  announce "* Release #{$package_version} Complete."
  announce "* Packages ready to upload."
  announce "**************************************************************"
  announce
end

# Validate that everything is ready to go for a release.
task :prerelease, :rel, :reuse, :reltest do |t, args|
  $package_version = args.rel
  announce
  announce "**************************************************************"
  announce "* Making RubyGem Release #{$package_version}"
  announce "* (current version #{CURRENT_VERSION})"
  announce "**************************************************************"
  announce

  # Is a release number supplied?
  unless args.rel
    fail "Usage: rake release[X.Y.Z] [REUSE=tag_suffix]"
  end

  # Is the release different than the current release.
  # (or is REUSE set?)
  if $package_version == CURRENT_VERSION && ! args.reuse
    fail "Current version is #{$package_version}, must specify REUSE=tag_suffix to reuse version"
  end

  # Are all source files checked in?
  if args.reltest
    announce "Release Task Testing, skipping checked-in file test"
  else
    announce "Checking for unchecked-in files..."
    data = `svn st`
    unless data =~ /^$/
      abort "svn status is not clean ... do you have unchecked-in files?"
    end
    announce "No outstanding checkins found ... OK"
  end
end

task :update_version, [:rel, :reuse, :reltest] => [:prerelease] do |t, args|
  if args.rel == CURRENT_VERSION
    announce "No version change ... skipping version update"
  else
    announce "Updating Rake version to #{args.rel}"
    open("lib/rake.rb") do |rakein|
      open("lib/rake.rb.new", "w") do |rakeout|
        rakein.each do |line|
          if line =~ /^RAKEVERSION\s*=\s*/
            rakeout.puts "RAKEVERSION = '#{args.rel}'"
          else
            rakeout.puts line
          end
        end
      end
    end
    mv "lib/rake.rb.new", "lib/rake.rb"
    if args.reltest
      announce "Release Task Testing, skipping commiting of new version"
    else
      sh %{svn commit -m "Updated to version #{args.rel}" lib/rake.rb} # "
    end
  end
end

desc "Tag all the CVS files with the latest release number (REL=x.y.z)"
task :tag, [:rel, :reuse, :reltest] => [:prerelease] do |t, args|
  reltag = "REL_#{args.rel.gsub(/\./, '_')}"
  reltag << args.reuse.gsub(/\./, '_') if args.reuse
  announce "Tagging Repository with [#{reltag}]"
  if args.reltest
    announce "Release Task Testing, skipping CVS tagging"
  else
    sh %{svn copy svn+ssh://rubyforge.org/var/svn/rake/trunk svn+ssh://rubyforge.org/var/svn/rake/tags/#{reltag} -m 'Commiting release #{reltag}'} ###'
  end
end

# Require experimental XForge/Metaproject support.

load 'xforge.rf' if File.exist?('xforge.rf')

desc "Where is the current directory.  This task displays\nthe current rake directory"
task :where_am_i do
  puts Rake.original_dir
end

task :failure => :really_fail
task :really_fail do
  fail "oops"
end
