require 'rake/ext/core'

######################################################################
# Rake extension methods for String.
#
class String
  rake_extension("ext") do
    # Replace the file extension with +newext+.  If there is no extension on
    # the string, append the new extension to the end.  If the new extension
    # is not given, or is the empty string, remove any existing extension.
    #
    # +ext+ is a user added method for the String class.
    def ext(newext='')
      return self.dup if ['.', '..'].include? self
      if newext != ''
        newext = (newext =~ /^\./) ? newext : ("." + newext)
      end
      self.chomp(File.extname(self)) << newext
    end
  end

  rake_extension("pathmap") do
    # Explode a path into individual components.  Used by +pathmap+.
    def pathmap_explode
      head, tail = File.split(self)
      return [self] if head == self
      return [tail] if head == '.' || tail == '/'
      return [head, tail] if head == '/'
      return head.pathmap_explode + [tail]
    end
    protected :pathmap_explode

    # Extract a partial path from the path.  Include +n+ directories from the
    # front end (left hand side) if +n+ is positive.  Include |+n+|
    # directories from the back end (right hand side) if +n+ is negative.
    def pathmap_partial(n)
      dirs = File.dirname(self).pathmap_explode
      partial_dirs =
        if n > 0
          dirs[0...n]
        elsif n < 0
          dirs.reverse[0...-n].reverse
        else
          "."
        end
      File.join(partial_dirs)
    end
    protected :pathmap_partial

    # Preform the pathmap replacement operations on the given path. The
    # patterns take the form 'pat1,rep1;pat2,rep2...'.
    def pathmap_replace(patterns, &block)
      result = self
      patterns.split(';').each do |pair|
        pattern, replacement = pair.split(',')
        pattern = Regexp.new(pattern)
        if replacement == '*' && block_given?
          result = result.sub(pattern, &block)
        elsif replacement
          result = result.sub(pattern, replacement)
        else
          result = result.sub(pattern, '')
        end
      end
      result
    end
    protected :pathmap_replace

    # Map the path according to the given specification.  The specification
    # controls the details of the mapping.  The following special patterns are
    # recognized:
    #
    # * <b>%p</b> -- The complete path.
    # * <b>%f</b> -- The base file name of the path, with its file extension,
    #   but without any directories.
    # * <b>%n</b> -- The file name of the path without its file extension.
    # * <b>%d</b> -- The directory list of the path.
    # * <b>%x</b> -- The file extension of the path.  An empty string if there
    #   is no extension.
    # * <b>%X</b> -- Everything *but* the file extension.
    # * <b>%s</b> -- The alternate file separator if defined, otherwise use
    #   the standard file separator.
    # * <b>%%</b> -- A percent sign.
    #
    # The %d specifier can also have a numeric prefix (e.g. '%2d'). If the
    # number is positive, only return (up to) +n+ directories in the path,
    # starting from the left hand side.  If +n+ is negative, return (up to)
    # |+n+| directories from the right hand side of the path.
    #
    # Examples:
    #
    #   'a/b/c/d/file.txt'.pathmap("%2d")   => 'a/b'
    #   'a/b/c/d/file.txt'.pathmap("%-2d")  => 'c/d'
    #
    # Also the %d, %p, %f, %n, %x, and %X operators can take a
    # pattern/replacement argument to perform simple string substitutions on a
    # particular part of the path.  The pattern and replacement are separated
    # by a comma and are enclosed by curly braces.  The replacement spec comes
    # after the % character but before the operator letter.  (e.g.
    # "%{old,new}d").  Multiple replacement specs should be separated by
    # semi-colons (e.g. "%{old,new;src,bin}d").
    #
    # Regular expressions may be used for the pattern, and back refs may be
    # used in the replacement text.  Curly braces, commas and semi-colons are
    # excluded from both the pattern and replacement text (let's keep parsing
    # reasonable).
    #
    # For example:
    #
    #    "src/org/onestepback/proj/A.java".pathmap("%{^src,bin}X.class")
    #
    # returns:
    #
    #    "bin/org/onestepback/proj/A.class"
    #
    # If the replacement text is '*', then a block may be provided to perform
    # some arbitrary calculation for the replacement.
    #
    # For example:
    #
    #   "/path/to/file.TXT".pathmap("%X%{.*,*}x") { |ext|
    #      ext.downcase
    #   }
    #
    # Returns:
    #
    #  "/path/to/file.txt"
    #
    def pathmap(spec=nil, &block)
      return self if spec.nil?
      result = ''
      spec.scan(/%\{[^}]*\}-?\d*[sdpfnxX%]|%-?\d+d|%.|[^%]+/) do |frag|
        case frag
        when '%f'
          result << File.basename(self)
        when '%n'
          result << File.basename(self).ext
        when '%d'
          result << File.dirname(self)
        when '%x'
          result << File.extname(self)
        when '%X'
          result << self.ext
        when '%p'
          result << self
        when '%s'
          result << (File::ALT_SEPARATOR || File::SEPARATOR)
        when '%-'
          # do nothing
        when '%%'
          result << "%"
        when /%(-?\d+)d/
          result << pathmap_partial($1.to_i)
        when /^%\{([^}]*)\}(\d*[dpfnxX])/
          patterns, operator = $1, $2
          result << pathmap('%' + operator).pathmap_replace(patterns, &block)
        when /^%/
          fail ArgumentError, "Unknown pathmap specifier #{frag} in '#{spec}'"
        else
          result << frag
        end
      end
      result
    end
  end
end # class String

