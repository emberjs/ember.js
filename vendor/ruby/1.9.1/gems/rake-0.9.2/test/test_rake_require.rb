require File.expand_path('../helper', __FILE__)

class TestRakeRequire < Rake::TestCase

  def test_can_load_rake_library
    app = Rake::Application.new
    assert app.instance_eval {
      rake_require("test2", ['test/data/rakelib'], [])
    }
  end

  def test_wont_reload_rake_library
    app = Rake::Application.new

    paths = ['test/data/rakelib']
    loaded_files = []
    app.rake_require("test2", paths, loaded_files)

    assert ! app.instance_eval {
      rake_require("test2", paths, loaded_files)
    }
  end

  def test_throws_error_if_library_not_found
    app = Rake::Application.new
    ex = assert_raises(LoadError) {
      assert app.instance_eval {
        rake_require("testx", ['test/data/rakelib'], [])
      }
    }
    assert_match(/(can *not|can't)\s+find/i, ex.message)
    assert_match(/testx/, ex.message)
  end
end

