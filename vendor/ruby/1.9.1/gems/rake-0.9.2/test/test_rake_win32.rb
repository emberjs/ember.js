require File.expand_path('../helper', __FILE__)

class TestRakeWin32 < Rake::TestCase
  include InEnvironment

  Win32 = Rake::Win32

  def test_win32_system_dir_uses_home_if_defined
    in_environment('RAKE_SYSTEM' => nil, 'HOME' => 'C:\\HP') do
      assert_equal "C:/HP/Rake", Win32.win32_system_dir
    end
  end

  def test_win32_system_dir_uses_homedrive_homepath_when_no_home_defined
    in_environment(
      'RAKE_SYSTEM' => nil,
      'HOME' => nil,
      'HOMEDRIVE' => "C:",
      'HOMEPATH' => "\\HP"
      ) do
      assert_equal "C:/HP/Rake", Win32.win32_system_dir
    end
  end

  def test_win32_system_dir_uses_appdata_when_no_home_or_home_combo
    in_environment(
      'RAKE_SYSTEM' => nil,
      'HOME' => nil,
      'HOMEDRIVE' => nil,
      'HOMEPATH' => nil,
      'APPDATA' => "C:\\Documents and Settings\\HP\\Application Data"
      ) do
      assert_equal "C:/Documents and Settings/HP/Application Data/Rake", Win32.win32_system_dir
    end
  end

  def test_win32_system_dir_fallback_to_userprofile_otherwise
    in_environment(
      'RAKE_SYSTEM' => nil,
      'HOME' => nil,
      'HOMEDRIVE' => nil,
      'HOMEPATH' => nil,
      'APPDATA' => nil,
      'USERPROFILE' => "C:\\Documents and Settings\\HP"
      ) do
      assert_equal "C:/Documents and Settings/HP/Rake", Win32.win32_system_dir
    end
  end

  def test_win32_system_dir_nil_of_no_env_vars
    in_environment(
      'RAKE_SYSTEM' => nil,
      'HOME' => nil,
      'HOMEDRIVE' => nil,
      "HOMEPATH" => nil,
      'APPDATA' => nil,
      "USERPROFILE" => nil
      ) do
      assert_raises(Rake::Win32::Win32HomeError) do
        Win32.win32_system_dir
      end
    end
  end

  def test_win32_backtrace_with_different_case
    ex = nil
    begin
     raise 'test exception'
    rescue => ex
    end

    ex.set_backtrace ['abc', 'rakefile']

    rake = Rake::Application.new
    rake.options.trace = true
    rake.instance_variable_set(:@rakefile, 'Rakefile')

    _, err = capture_io { rake.display_error_message(ex) }

    assert_match(/rakefile/, err)
  end

end
