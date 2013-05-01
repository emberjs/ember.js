require 'ember/version'

module Ember
  module Source
    def self.bundled_path_for(distro)
      File.expand_path("../../../dist/#{distro}", __FILE__)
    end
  end
end
