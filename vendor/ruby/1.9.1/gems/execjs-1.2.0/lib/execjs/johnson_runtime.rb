module ExecJS
  class JohnsonRuntime
    class Context
      def initialize(source = "")
        @runtime = Johnson::Runtime.new
        @runtime.evaluate(source)
      end

      def exec(source, options = {})
        souce = source.encode('UTF-8') if source.respond_to?(:encode)

        if /\S/ =~ source
          eval "(function(){#{source}})()", options
        end
      end

      def eval(source, options = {})
        souce = source.encode('UTF-8') if source.respond_to?(:encode)

        if /\S/ =~ source
          unbox @runtime.evaluate("(#{source})")
        end
      rescue Johnson::Error => e
        if syntax_error?(e)
          raise RuntimeError, e.message
        else
          raise ProgramError, e.message
        end
      end

      def call(properties, *args)
        unbox @runtime.evaluate(properties).call(*args)
      rescue Johnson::Error => e
        if syntax_error?(e)
          raise RuntimeError, e.message
        else
          raise ProgramError, e.message
        end
      end

      def unbox(value)
        case
        when function?(value)
          nil
        when string?(value)
          value.respond_to?(:force_encoding) ?
            value.force_encoding('UTF-8') :
            value
        when array?(value)
          value.map { |v| unbox(v) }
        when object?(value)
          value.inject({}) do |vs, (k, v)|
            vs[k] = unbox(v) unless function?(v)
            vs
          end
        else
          value
        end
      end

      private
        def syntax_error?(error)
          error.message =~ /^syntax error at /
        end

        def function?(value)
          value.respond_to?(:function?) && value.function?
        end

        def string?(value)
          value.is_a?(String)
        end

        def array?(value)
          array_test.call(value)
        end

        def object?(value)
          value.respond_to?(:inject)
        end

        def array_test
          @array_test ||= @runtime.evaluate("(function(a) {return a instanceof [].constructor})")
        end
    end

    def name
      "Johnson (SpiderMonkey)"
    end

    def exec(source)
      context = Context.new
      context.exec(source)
    end

    def eval(source)
      context = Context.new
      context.eval(source)
    end

    def compile(source)
      Context.new(source)
    end

    def available?
      require "johnson"
      true
    rescue LoadError
      false
    end
  end
end
