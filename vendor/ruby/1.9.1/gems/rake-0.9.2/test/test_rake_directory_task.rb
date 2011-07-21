require File.expand_path('../helper', __FILE__)
require 'fileutils'

class TestRakeDirectoryTask < Rake::TestCase
  include Rake

  def setup
    super

    Rake.rm_rf "testdata", :verbose=>false
  end

  def teardown
    Rake.rm_rf "testdata", :verbose=>false

    super
  end

  def test_directory
    desc "DESC"
    directory "testdata/a/b/c"
    assert_equal FileCreationTask, Task["testdata"].class
    assert_equal FileCreationTask, Task["testdata/a"].class
    assert_equal FileCreationTask, Task["testdata/a/b/c"].class
    assert_nil             Task["testdata"].comment
    assert_equal "DESC",   Task["testdata/a/b/c"].comment
    assert_nil             Task["testdata/a/b"].comment
    verbose(false) {
      Task['testdata/a/b'].invoke
    }
    assert File.exist?("testdata/a/b")
    assert ! File.exist?("testdata/a/b/c")
  end

  if Rake::Win32.windows?
    def test_directory_win32
      desc "WIN32 DESC"
      FileUtils.mkdir_p("testdata")
      Dir.chdir("testdata") do
        directory 'c:/testdata/a/b/c'
        assert_equal FileCreationTask, Task['c:/testdata'].class
        assert_equal FileCreationTask, Task['c:/testdata/a'].class
        assert_equal FileCreationTask, Task['c:/testdata/a/b/c'].class
        assert_nil             Task['c:/testdata'].comment
        assert_equal "WIN32 DESC",   Task['c:/testdata/a/b/c'].comment
        assert_nil             Task['c:/testdata/a/b'].comment
        verbose(false) {
          Task['c:/testdata/a/b'].invoke
        }
        assert File.exist?('c:/testdata/a/b')
        assert ! File.exist?('c:/testdata/a/b/c')
      end
    end
  end
end
