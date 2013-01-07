# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant::Config.run do |config|
  config.vm.box = "precise64-ruby-1.9.3-p194"
  config.vm.box_url = "https://dl.dropbox.com/u/14292474/vagrantboxes/precise64-ruby-1.9.3-p194.box"

  # We need a javascript runtime to build ember.js with rake
  # and phantomjs to execute test suite.
  #
  config.vm.provision :chef_solo do |chef|
    chef.cookbooks_path = "cookbooks"
    chef.add_recipe "nodejs::install_from_source"
    chef.add_recipe "phantomjs"
  end
end
