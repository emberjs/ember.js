require 'rake-pipeline'
require 'rake-pipeline/middleware'

use Rake::Pipeline::Middleware, "Assetfile"
run Rack::Directory.new('.')
