files = Dir["packages/ember-*/lib/**/*.js"] - Dir["packages/ember-runtime/**/*.js"]
files = Dir["packages/ember-{metal,views,handlebars}/lib/**/*.js"]

def uglify(string)
  IO.popen("uglifyjs", "r+") do |io|
    io.puts string
    io.close_write
    return io.read
  end
end

def gzip(string)
  IO.popen("gzip -f", "r+") do |io|
    io.puts string
    io.close_write
    return io.read
  end
end


string = ""

files.each do |file|
  this_file = File.read(file)
  string += this_file
  size = this_file.size
  uglified = uglify(this_file)
  gzipped = gzip(uglified)

  puts "%8d %8d %8d - %s" % [size, uglified.size, gzipped.size, file]
end

uglified = uglify(string)
gzipped = gzip(uglified)

puts "%8d %8d %8d" % [string.size, uglified.size, gzipped.size]
