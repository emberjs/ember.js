module ExecJS
  class MustangRuntime
    class Context
      def initialize(source = "")
        source = source.encode('UTF-8') if source.respond_to?(:encode)

        @v8_context = ::Mustang::Context.new
        @v8_context.eval(source)
      end

      def exec(source, options = {})
        source = source.encode('UTF-8') if source.respond_to?(:encode)

        if /\S/ =~ source
          eval "(function(){#{source}})()", options
        end
      end

      def eval(source, options = {})
        source = source.encode('UTF-8') if source.respond_to?(:encode)

        if /\S/ =~ source
          unbox @v8_context.eval("(#{source})")
        end
      end

      def call(properties, *args)
        unbox @v8_context.eval(properties).call(*args)
      rescue NoMethodError => e
        raise ProgramError, e.message
      end

      def unbox(value)
        case value
        when Mustang::V8::Array
          value.map { |v| unbox(v) }
        when Mustang::V8::Boolean
          value.to_bool
        when Mustang::V8::NullClass, Mustang::V8::UndefinedClass
          nil
        when Mustang::V8::Function
          nil
        when Mustang::V8::SyntaxError
          raise RuntimeError, value.message
        when Mustang::V8::Error
          raise ProgramError, value.message
        else
          value.respond_to?(:delegate) ? value.delegate : value
        end
      end
    end

    def name
      "Mustang (V8)"
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
      require "mustang"
      true
    rescue LoadError
      false
    end
  end
end
