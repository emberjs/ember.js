require "rest-client"
require "github_api"

class GithubUploader

  def initialize(login, username, repo, token=nil, root=Dir.pwd)
    @login    = login
    @username = username
    @repo     = repo
    @root     = root
    @token    = token || check_token
  end

  def authorized?
    !!@token
  end

  def token_path
    File.expand_path(".github-upload-token", @root) 
  end

  def check_token
    File.exist?(token_path) ? File.open(token_path, "rb").read : nil
  end

  def authorize
    return if authorized?

    puts "There is no file named .github-upload-token in this folder. This file holds the OAuth token needed to communicate with GitHub."
    puts "You will be asked to enter your GitHub password so a new OAuth token will be created."
    print "GitHub Password: "
    system "stty -echo" # disable echoing of entered chars so password is not shown on console
    pw = STDIN.gets.chomp
    system "stty echo" # enable echoing of entered chars
    puts ""

    # check if the user already granted access for Ember.js Uploader by checking the available authorizations
    response = RestClient.get "https://#{@login}:#{pw}@api.github.com/authorizations"
    JSON.parse(response.to_str).each do |auth|
      if auth["note"] == "Ember.js Uploader"
        # user already granted access, so we reuse the existing token
        @token = auth["token"]
      end
    end

    ## we need to create a new token
    unless @token
      payload = {
        :scopes => ["public_repo"],
        :note => "Ember.js Uploader",
        :note_url => "https://github.com/#{@username}/#{@repo}"
      }
      response = RestClient.post "https://#{@login}:#{pw}@api.github.com/authorizations", payload.to_json, :content_type => :json
      @token = JSON.parse(response.to_str)["token"]
    end

    # finally save the token into .github-upload-token
    File.open(".github-upload-token", 'w') {|f| f.write(@token)}
  end

  def upload_file(filename, description, file)
    return false unless authorized?

    gh = Github.new :user => @username, :repo => @repo, :oauth_token => @token

    # remvove previous download with the same name
    gh.repos.downloads do |download|
      if filename == download.name
        gh.repos.delete_download @username, @repo, download.id
        break
      end
    end

    # step 1
    hash = gh.repos.create_download @username, @repo,
      "name" => filename,
      "size" => File.size(file),
      "description" => description,
      "content_type" => "application/json"

    # step 2
    gh.repos.upload hash, file

    return true
  end

end
