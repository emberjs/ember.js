source "http://rubygems.org"

gem "execjs", ">=0.3.0"
gem "multi_json", ">= 1.0.2"

# Depend on defined ExecJS runtime
execjs_runtimes = {
  "RubyRacer" => "therubyracer",
  "RubyRhino" => "therubyrhino",
  "Mustang" => "mustang"
}

if ENV["EXECJS_RUNTIME"] && execjs_runtimes[ENV["EXECJS_RUNTIME"]]
  gem execjs_runtimes[ENV["EXECJS_RUNTIME"]], :group => :development
end

# Engine
gem ENV["MULTI_JSON_ENGINE"], :group => :development if ENV["MULTI_JSON_ENGINE"]

group :development do
  gem "rspec", "~> 2.6.0"
  gem "bundler", "~> 1.0.0"
  gem "jeweler", "~> 1.6.0"
  gem "rcov", ">= 0"
end
