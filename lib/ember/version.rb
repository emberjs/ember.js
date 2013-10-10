module Ember
  extend self

  VERSION = File.read(File.expand_path('../../../VERSION', __FILE__)).strip

  # we might want to unify this with the ember version string,
  # but consistency?
  def rubygems_version_string
    if VERSION =~ /rc|beta/
      major, rc = VERSION.sub('-','.').scan(/(\d+\.\d+\.\d+\.(rc|beta))\.(\d+)/).first

      "#{major}#{rc}"
    else
      VERSION
    end
  end
end
