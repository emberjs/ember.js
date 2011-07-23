require File.expand_path('../helper', __FILE__)

class TestRakeApplication < Rake::TestCase
  include InEnvironment

  def setup
    super

    @app = Rake::Application.new
    @app.options.rakelib = []
    Rake::TaskManager.record_task_metadata = true
  end

  def teardown
    Rake::TaskManager.record_task_metadata = false

    super
  end

  def test_constant_warning
    _, err = capture_io do @app.instance_eval { const_warning("Task") } end
    assert_match(/warning/i, err)
    assert_match(/deprecated/i, err)
    assert_match(/Task/i, err)
  end

  def test_display_tasks
    @app.options.show_tasks = :tasks
    @app.options.show_task_pattern = //
    @app.last_description = "COMMENT"
    @app.define_task(Rake::Task, "t")
    out, = capture_io do @app.instance_eval { display_tasks_and_comments } end
    assert_match(/^rake t/, out)
    assert_match(/# COMMENT/, out)
  end

  def test_display_tasks_with_long_comments
    in_environment('RAKE_COLUMNS' => '80') do
      @app.options.show_tasks = :tasks
      @app.options.show_task_pattern = //
      @app.last_description = "1234567890" * 8
      @app.define_task(Rake::Task, "t")
      out, = capture_io do @app.instance_eval { display_tasks_and_comments } end
      assert_match(/^rake t/, out)
      assert_match(/# 12345678901234567890123456789012345678901234567890123456789012345\.\.\./, out)
    end
  end

  def test_display_tasks_with_task_name_wider_than_tty_display
    in_environment('RAKE_COLUMNS' => '80') do
      @app.options.show_tasks = :tasks
      @app.options.show_task_pattern = //
      task_name = "task name" * 80
      @app.last_description = "something short"
      @app.define_task(Rake::Task, task_name )
      out, = capture_io do @app.instance_eval { display_tasks_and_comments } end
      # Ensure the entire task name is output and we end up showing no description
      assert_match(/rake #{task_name}  # .../, out)
    end
  end

  def test_display_tasks_with_very_long_task_name_to_a_non_tty_shows_name_and_comment
    @app.options.show_tasks = :tasks
    @app.options.show_task_pattern = //
    @app.tty_output = false
    description = "something short"
    task_name = "task name" * 80
    @app.last_description = "something short"
    @app.define_task(Rake::Task, task_name )
    out, = capture_io do @app.instance_eval { display_tasks_and_comments } end
    # Ensure the entire task name is output and we end up showing no description
    assert_match(/rake #{task_name}  # #{description}/, out)
  end

  def test_display_tasks_with_long_comments_to_a_non_tty_shows_entire_comment
    @app.options.show_tasks = :tasks
    @app.options.show_task_pattern = //
    @app.tty_output = false
    @app.last_description = "1234567890" * 8
    @app.define_task(Rake::Task, "t")
    out, = capture_io do @app.instance_eval { display_tasks_and_comments } end
    assert_match(/^rake t/, out)
    assert_match(/# #{@app.last_description}/, out)
  end

  def test_display_tasks_with_long_comments_to_a_non_tty_with_columns_set_truncates_comments
    in_environment("RAKE_COLUMNS" => '80') do
      @app.options.show_tasks = :tasks
      @app.options.show_task_pattern = //
      @app.tty_output = false
      @app.last_description = "1234567890" * 8
      @app.define_task(Rake::Task, "t")
      out, = capture_io do @app.instance_eval { display_tasks_and_comments } end
      assert_match(/^rake t/, out)
      assert_match(/# 12345678901234567890123456789012345678901234567890123456789012345\.\.\./, out)
    end
  end

  def test_describe_tasks
    @app.options.show_tasks = :describe
    @app.options.show_task_pattern = //
    @app.last_description = "COMMENT"
    @app.define_task(Rake::Task, "t")
    out, = capture_io do @app.instance_eval { display_tasks_and_comments } end
    assert_match(/^rake t$/, out)
    assert_match(/^ {4}COMMENT$/, out)
  end

  def test_show_lines
    @app.options.show_tasks = :lines
    @app.options.show_task_pattern = //
    @app.last_description = "COMMENT"
    @app.define_task(Rake::Task, "t")
    @app['t'].locations << "HERE:1"
    out, = capture_io do @app.instance_eval { display_tasks_and_comments } end
    assert_match(/^rake t +[^:]+:\d+ *$/, out)
  end

  def test_finding_rakefile
    assert_match(/Rakefile/i, @app.instance_eval { have_rakefile })
  end

  def test_not_finding_rakefile
    @app.instance_eval { @rakefiles = ['NEVER_FOUND'] }
    assert( ! @app.instance_eval do have_rakefile end )
    assert_nil @app.rakefile
  end

  def test_load_rakefile
    in_environment("PWD" => "test/data/unittest") do
      @app.instance_eval do
        handle_options
        options.silent = true
        load_rakefile
      end
      assert_equal "rakefile", @app.rakefile.downcase
      assert_match(%r(unittest$), Dir.pwd)
    end
  end

  def test_load_rakefile_doesnt_print_rakefile_directory_from_same_dir
    in_environment("PWD" => "test/data/unittest") do
      _, err = capture_io do
        @app.instance_eval do
          @original_dir = File.expand_path(".") # pretend we started from the unittest dir
          raw_load_rakefile
        end
      end
      _, location = @app.find_rakefile_location
      refute_match(/\(in #{location}\)/, err)
    end
  end

  def test_load_rakefile_from_subdir
    in_environment("PWD" => "test/data/unittest/subdir") do
      @app.instance_eval do
        handle_options
        options.silent = true
        load_rakefile
      end
      assert_equal "rakefile", @app.rakefile.downcase
      assert_match(%r(unittest$), Dir.pwd)
    end
  end

  def test_load_rakefile_prints_rakefile_directory_from_subdir
    in_environment("PWD" => "test/data/unittest/subdir") do
      _, err = capture_io do
        @app.instance_eval do
          raw_load_rakefile
        end
      end
      _, location = @app.find_rakefile_location
      assert_match(/\(in #{location}\)/, err)
    end
  end

  def test_load_rakefile_doesnt_print_rakefile_directory_from_subdir_if_silent
    in_environment("PWD" => "test/data/unittest/subdir") do
      _, err = capture_io do
        @app.instance_eval do
          handle_options
          options.silent = true
          raw_load_rakefile
        end
      end
      _, location = @app.find_rakefile_location
      refute_match(/\(in #{location}\)/, err)
    end
  end

  def test_load_rakefile_not_found
    in_environment("PWD" => "/", "RAKE_SYSTEM" => 'not_exist') do
      @app.instance_eval do
        handle_options
        options.silent = true
      end
      ex = assert_raises(RuntimeError) do
        @app.instance_eval do raw_load_rakefile end
      end
      assert_match(/no rakefile found/i, ex.message)
    end
  end

  def test_load_from_system_rakefile
    in_environment('RAKE_SYSTEM' => 'test/data/sys') do
      @app.options.rakelib = []
      @app.instance_eval do
        handle_options
        options.silent = true
        options.load_system = true
        options.rakelib = []
        load_rakefile
      end
      assert_equal "test/data/sys", @app.system_dir
      assert_nil @app.rakefile
    end
  end

  def test_load_from_calculated_system_rakefile
    flexmock(@app, :standard_system_dir => "__STD_SYS_DIR__")
    in_environment('RAKE_SYSTEM' => nil) do
      @app.options.rakelib = []
      @app.instance_eval do
        handle_options
        options.silent = true
        options.load_system = true
        options.rakelib = []
        load_rakefile
      end
      assert_equal "__STD_SYS_DIR__", @app.system_dir
    end
  end

  def test_windows
    assert ! (@app.windows? && @app.unix?)
  end

  def test_loading_imports
    mock = flexmock("loader")
    mock.should_receive(:load).with("x.dummy").once
    @app.instance_eval do
      add_loader("dummy", mock)
      add_import("x.dummy")
      load_imports
    end
  end

  def test_building_imported_files_on_demand
    mock = flexmock("loader")
    mock.should_receive(:load).with("x.dummy").once
    mock.should_receive(:make_dummy).with_no_args.once
    @app.instance_eval do
      intern(Rake::Task, "x.dummy").enhance do mock.make_dummy end
        add_loader("dummy", mock)
      add_import("x.dummy")
      load_imports
    end
  end

  def test_handle_options_should_strip_options_from_ARGV
    assert !@app.options.trace

    valid_option = '--trace'
    ARGV.clear
    ARGV << valid_option

    @app.handle_options

    assert !ARGV.include?(valid_option)
    assert @app.options.trace
  end

  def test_good_run
    ran = false
    ARGV.clear
    ARGV << '--rakelib=""'
    @app.options.silent = true
    @app.instance_eval do
      intern(Rake::Task, "default").enhance { ran = true }
    end
    in_environment("PWD" => "test/data/default") do
      @app.run
    end
    assert ran
  end

  def test_display_task_run
    ran = false
    ARGV.clear
    ARGV << '-f' << '-s' << '--tasks' << '--rakelib=""'
    @app.last_description = "COMMENT"
    @app.define_task(Rake::Task, "default")
    out, = capture_io { @app.run }
    assert @app.options.show_tasks
    assert ! ran
    assert_match(/rake default/, out)
    assert_match(/# COMMENT/, out)
  end

  def test_display_prereqs
    ran = false
    ARGV.clear
    ARGV << '-f' << '-s' << '--prereqs' << '--rakelib=""'
    @app.last_description = "COMMENT"
    t = @app.define_task(Rake::Task, "default")
    t.enhance([:a, :b])
    @app.define_task(Rake::Task, "a")
    @app.define_task(Rake::Task, "b")
    out, = capture_io { @app.run }
    assert @app.options.show_prereqs
    assert ! ran
    assert_match(/rake a$/, out)
    assert_match(/rake b$/, out)
    assert_match(/rake default\n( *(a|b)\n){2}/m, out)
  end

  def test_bad_run
    @app.intern(Rake::Task, "default").enhance { fail }
    ARGV.clear
    ARGV << '-f' << '-s' <<  '--rakelib=""'
    assert_raises(SystemExit) {
      _, err = capture_io { @app.run }
      assert_match(/see full trace/, err)
    }
  ensure
    ARGV.clear
  end

  def test_bad_run_with_trace
    @app.intern(Rake::Task, "default").enhance { fail }
    ARGV.clear
    ARGV << '-f' << '-s' << '-t'
    assert_raises(SystemExit) {
      _, err = capture_io { @app.run }
      refute_match(/see full trace/, err)
    }
  ensure
    ARGV.clear
  end

  def test_run_with_bad_options
    @app.intern(Rake::Task, "default").enhance { fail }
    ARGV.clear
    ARGV << '-f' << '-s' << '--xyzzy'
    assert_raises(SystemExit) {
      capture_io { @app.run }
    }
  ensure
    ARGV.clear
  end

  def test_deprecation_message
    in_environment do
      _, err = capture_io do
        @app.deprecate("a", "b", "c")
      end
      assert_match(/'a' is deprecated/i, err)
      assert_match(/use 'b' instead/i, err)
      assert_match(/at c$/i, err)
    end
  end
end

