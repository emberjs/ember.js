require 'helper'
require 'stringio'

class MockDecoder
  def self.decode(string, options = {})
    {'abc' => 'def'}
  end

  def self.encode(string)
    '{"abc":"def"}'
  end
end

describe "MultiJson" do
  context 'engines' do
    it 'defaults to ok_json if no other json implementions are available' do
      old_map = MultiJson::REQUIREMENT_MAP
      begin
        MultiJson::REQUIREMENT_MAP.each_with_index do |(library, engine), index|
          MultiJson::REQUIREMENT_MAP[index] = ["foo/#{library}", engine]
        end
        MultiJson.default_engine.should == :ok_json
      ensure
        old_map.each_with_index do |(library, engine), index|
          MultiJson::REQUIREMENT_MAP[index] = [library, engine]
        end
      end
    end

    it 'defaults to the best available gem' do
      require 'yajl'
      MultiJson.engine.name.should == 'MultiJson::Engines::Yajl'
    end

    it 'is settable via a symbol' do
      MultiJson.engine = :json_gem
      MultiJson.engine.name.should == 'MultiJson::Engines::JsonGem'
    end

    it 'is settable via a class' do
      MultiJson.engine = MockDecoder
      MultiJson.engine.name.should == 'MockDecoder'
    end
  end

  %w(json_gem json_pure ok_json yajl).each do |engine|
    context engine do
      before do
        begin
          MultiJson.engine = engine
        rescue LoadError
          pending "Engine #{engine} couldn't be loaded (not installed?)"
        end
      end

      describe '.encode' do
        it 'writes decodable JSON' do
          [
            { 'abc' => 'def' },
            [1, 2, 3, "4"]
          ].each do |example|
            MultiJson.decode(MultiJson.encode(example)).should == example
          end
        end

        it 'encodes symbol keys as strings' do
          [
            [
              { :foo => { :bar => 'baz' } },
              { 'foo' => { 'bar' => 'baz' } }
            ],
            [
              [ { :foo => { :bar => 'baz' } } ],
              [ { 'foo' => { 'bar' => 'baz' } } ],
            ],
            [
              { :foo => [ { :bar => 'baz' } ] },
              { 'foo' => [ { 'bar' => 'baz' } ] },
            ]
          ].each do |example, expected|
            encoded_json = MultiJson.encode(example)
            MultiJson.decode(encoded_json).should == expected
          end
        end

        it 'encodes rootless JSON' do
          MultiJson.encode("random rootless string").should == "\"random rootless string\""
          MultiJson.encode(123).should == "123"
        end
      end

      describe '.decode' do
        it 'properly decodes valid JSON' do
          MultiJson.decode('{"abc":"def"}').should == { 'abc' => 'def' }
        end

        it 'raises MultiJson::DecodeError on invalid JSON' do
          lambda do
            MultiJson.decode('{"abc"}')
          end.should raise_error(MultiJson::DecodeError)
        end

        it 'stringifys symbol keys when encoding' do
          encoded_json = MultiJson.encode(:a => 1, :b => {:c => 2})
          MultiJson.decode(encoded_json).should == { "a" => 1, "b" => { "c" => 2 } }
        end

        it "properly decodes valid JSON in StringIOs" do
          json = StringIO.new('{"abc":"def"}')
          MultiJson.decode(json).should == { 'abc' => 'def' }
        end

        it 'allows for symbolization of keys' do
          [
            [
              '{"abc":{"def":"hgi"}}',
              { :abc => { :def => 'hgi' } }
            ],
            [
              '[{"abc":{"def":"hgi"}}]',
              [ { :abc => { :def => 'hgi' } } ]
            ],
            [
              '{"abc":[{"def":"hgi"}]}',
              { :abc => [ { :def => 'hgi' } ] }
            ],
          ].each do |example, expected|
            MultiJson.decode(example, :symbolize_keys => true).should == expected
          end
        end
      end
    end
  end
end
