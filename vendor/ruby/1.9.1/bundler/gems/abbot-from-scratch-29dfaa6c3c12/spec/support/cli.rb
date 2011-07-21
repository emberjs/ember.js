require "timeout"
require "child_labor"

module SproutCore
  module Spec
    module CLIExecution
      def self.included(klass)
        klass.class_eval do
          before do
            cd root
            env({})
          end
        end
      end

      def dir
        Thread.current[:strobe_dir]
      end

      def dir=(dir)
        Thread.current[:strobe_dir] = dir
      end

      def env=(env)
        Thread.current[:strobe_env] = env
      end

      def cd(change_into)
        original, self.dir = dir, change_into
        yield if block_given?
      ensure
        self.dir = original if block_given?
      end

      def env(hash = nil)
        return Thread.current[:strobe_env] unless hash

        original, self.env = env, hash
        yield if block_given?
      ensure
        self.env = original if block_given?
      end

      def system_home
        Thread.current[:system_home] ||= begin
          location = tmp.join("system_home_#{Thread.current.object_id}")
          FileUtils.mkdir_p(location)
          location
        end
      end

      def run_rake(flags)
        run ["rake", flags].compact.join(" ")
        task.wait
      end

      def rake(flags=nil)
        run_rake(flags)
        err.should == ""
      end

      def failed_rake(flags=nil)
        run_rake(flags)
        err.should_not == ""
      end

      def run(command)
        merged_env = env.merge("HOME" => system_home)
        env_string = merged_env.inject([]) { |env_str,env| env_str << %{#{env.first}="#{env.last}"} }

        self.task  = ChildLabor.subprocess("cd #{dir} && #{env_string.join(" ")} #{command}")

        if block_given?
          yield task
          task.terminate unless task.terminated?
          task.wait unless task.terminated?
        end
      end

      def task
        Thread.current[:task]
      end

      def task=(child)
        Thread.current[:task] = child
      end

      def out
        task.read
      end

      def err
        task.read_stderr
      end

      def out_until_block
        # read 1 first so we wait until the process is done processing the last write
        chars  = task.stdout.read(1)

        loop do
          chars << task.stdout.read_nonblock(1000)
          sleep 0.05
        end
      rescue Errno::EAGAIN, EOFError
        @last_out = chars
      end
    end
  end
end


