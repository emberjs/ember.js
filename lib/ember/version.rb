module Ember
  extend self

  VERSION = File.read(File.expand_path('../../../VERSION', __FILE__)).strip

  # we might want to unify this with the ember version string,
  # but consistency?
  def rubygems_version_string
    major, rc = VERSION.sub('-','.').scan(/(\d+\.\d+\.\d+\.rc)\.(\d+)/).first

    "#{major}#{rc}"
  end
end
