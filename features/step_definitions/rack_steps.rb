Given /^cleaned build artifacts$/ do
  `rm -rf tmp && rm -rf dist`
end

Given /^existed "([^"]*)" directory$/ do |arg1|
  Dir.mkdir(arg1)
end

When /^I run rake "([^"]*)"$/ do |arg1|
  `rake #{arg1}`
end

Then /^I should not have "([^"]*)" file in "([^"]*)" directory$/ do |arg1, arg2|
  File.exist?("#{arg2}/#{arg1}").should be_false
end

Then /^I should have "([^"]*)" file in "([^"]*)" directory$/ do |arg1, arg2|
  File.exist?("#{arg2}/#{arg1}").should be_true
end

Then /^I should have "([^"]*)" directory$/ do |arg1|
  Dir.exist?(arg1).should be_true
end

Then /^I should not nave "([^"]*)" directory$/ do |arg1|
  Dir.exist?(arg1).should be_false
end

Then /^"([^"]*)" file should have "([^"]*)" content$/ do |arg1, arg2|
  File.open("tmp/starter-kit/index.html") do |file|
    file.read.should =~ /#{arg2}/
  end
end
