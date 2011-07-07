# A sample Gemfile
source "http://rubygems.org"

gem "rake"
gem "bpm"
gem "spade"
gem "uglifier"

if abbot_path = ENV["ABBOT_PATH"]
  gem "sproutcore", :path => abbot_path
else
  gem "sproutcore", :git => "git://github.com/wycats/abbot-from-scratch.git"
end

