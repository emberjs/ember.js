# -*- encoding: utf-8 -*-

Gem::Specification.new do |s|
  s.name = %q{rake}
  s.version = "0.9.2"

  s.required_rubygems_version = Gem::Requirement.new(">= 1.3.2") if s.respond_to? :required_rubygems_version=
  s.authors = [%q{Jim Weirich}]
  s.date = %q{2011-06-05}
  s.description = %q{      Rake is a Make-like program implemented in Ruby. Tasks
      and dependencies are specified in standard Ruby syntax.
}
  s.email = %q{jim@weirichhouse.org}
  s.executables = [%q{rake}]
  s.extra_rdoc_files = [%q{README.rdoc}, %q{MIT-LICENSE}, %q{TODO}, %q{CHANGES}, %q{doc/command_line_usage.rdoc}, %q{doc/glossary.rdoc}, %q{doc/proto_rake.rdoc}, %q{doc/rakefile.rdoc}, %q{doc/rational.rdoc}, %q{doc/release_notes/rake-0.4.14.rdoc}, %q{doc/release_notes/rake-0.4.15.rdoc}, %q{doc/release_notes/rake-0.5.0.rdoc}, %q{doc/release_notes/rake-0.5.3.rdoc}, %q{doc/release_notes/rake-0.5.4.rdoc}, %q{doc/release_notes/rake-0.6.0.rdoc}, %q{doc/release_notes/rake-0.7.0.rdoc}, %q{doc/release_notes/rake-0.7.1.rdoc}, %q{doc/release_notes/rake-0.7.2.rdoc}, %q{doc/release_notes/rake-0.7.3.rdoc}, %q{doc/release_notes/rake-0.8.0.rdoc}, %q{doc/release_notes/rake-0.8.2.rdoc}, %q{doc/release_notes/rake-0.8.3.rdoc}, %q{doc/release_notes/rake-0.8.4.rdoc}, %q{doc/release_notes/rake-0.8.5.rdoc}, %q{doc/release_notes/rake-0.8.6.rdoc}, %q{doc/release_notes/rake-0.8.7.rdoc}, %q{doc/release_notes/rake-0.9.0.rdoc}, %q{doc/release_notes/rake-0.9.1.rdoc}, %q{doc/release_notes/rake-0.9.2.rdoc}]
  s.files = [%q{bin/rake}, %q{README.rdoc}, %q{MIT-LICENSE}, %q{TODO}, %q{CHANGES}, %q{doc/command_line_usage.rdoc}, %q{doc/glossary.rdoc}, %q{doc/proto_rake.rdoc}, %q{doc/rakefile.rdoc}, %q{doc/rational.rdoc}, %q{doc/release_notes/rake-0.4.14.rdoc}, %q{doc/release_notes/rake-0.4.15.rdoc}, %q{doc/release_notes/rake-0.5.0.rdoc}, %q{doc/release_notes/rake-0.5.3.rdoc}, %q{doc/release_notes/rake-0.5.4.rdoc}, %q{doc/release_notes/rake-0.6.0.rdoc}, %q{doc/release_notes/rake-0.7.0.rdoc}, %q{doc/release_notes/rake-0.7.1.rdoc}, %q{doc/release_notes/rake-0.7.2.rdoc}, %q{doc/release_notes/rake-0.7.3.rdoc}, %q{doc/release_notes/rake-0.8.0.rdoc}, %q{doc/release_notes/rake-0.8.2.rdoc}, %q{doc/release_notes/rake-0.8.3.rdoc}, %q{doc/release_notes/rake-0.8.4.rdoc}, %q{doc/release_notes/rake-0.8.5.rdoc}, %q{doc/release_notes/rake-0.8.6.rdoc}, %q{doc/release_notes/rake-0.8.7.rdoc}, %q{doc/release_notes/rake-0.9.0.rdoc}, %q{doc/release_notes/rake-0.9.1.rdoc}, %q{doc/release_notes/rake-0.9.2.rdoc}]
  s.homepage = %q{http://rake.rubyforge.org}
  s.rdoc_options = [%q{--line-numbers}, %q{--show-hash}, %q{--main}, %q{README.rdoc}, %q{--title}, %q{Rake -- Ruby Make}]
  s.require_paths = [%q{lib}]
  s.rubyforge_project = %q{rake}
  s.rubygems_version = %q{1.8.5}
  s.summary = %q{Ruby based make-like utility.}

  if s.respond_to? :specification_version then
    s.specification_version = 3

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<minitest>, ["~> 2.1"])
      s.add_development_dependency(%q<session>, ["~> 2.4"])
      s.add_development_dependency(%q<flexmock>, ["~> 0.8.11"])
    else
      s.add_dependency(%q<minitest>, ["~> 2.1"])
      s.add_dependency(%q<session>, ["~> 2.4"])
      s.add_dependency(%q<flexmock>, ["~> 0.8.11"])
    end
  else
    s.add_dependency(%q<minitest>, ["~> 2.1"])
    s.add_dependency(%q<session>, ["~> 2.4"])
    s.add_dependency(%q<flexmock>, ["~> 0.8.11"])
  end
end
