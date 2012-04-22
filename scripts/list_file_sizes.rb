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


all_files = ""
sizes = []

files.each do |file|
  this_file = File.read(file)
  all_files += this_file
  size = this_file.size
  uglified = uglify(this_file)
  gzipped = gzip(uglified)
  sizes << [size, uglified.size, gzipped.size, file]
end

# HEADER
puts "     RAW      MIN   MIN+GZ"

sizes.sort{|a,b| b[2] <=> a[2] }.each do |size|
  puts "%8d %8d %8d - %s" % size
end

uglified = uglify(all_files)
gzipped = gzip(uglified)

puts "%8d %8d %8d" % [all_files.size, uglified.size, gzipped.size]
