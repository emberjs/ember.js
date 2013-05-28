task :upload_release_to_s3 do
  require 'aws-sdk'
  if ENV['S3_ACCESS_KEY_ID'] && ENV['S3_SECRET_ACCESS_KEY'] &&
    ENV['S3_BUCKET_NAME']
    s3 = AWS::S3.new(access_key_id: ENV['S3_ACCESS_KEY_ID'],
                     secret_access_key: ENV['S3_SECRET_ACCESS_KEY'])
    bucket = s3.buckets[ENV['S3_BUCKET_NAME']]
    root = File.dirname(File.expand_path(__FILE__))
    Dir.entries('.').each do |file|
      next unless /\.js\z/ =~ file
      object = bucket.objects[file]
      next if object.exists?
      object.write(Pathname.new(root + "/#{file}"))
      puts "Published #{file} to S3!"
    end
  else
    puts "Not publishing any files because there are no credentials."
  end
end

task :default => [:upload_release_to_s3]
