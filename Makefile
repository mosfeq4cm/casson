test:
	node_modules/.bin/mocha test/*.js
test-cov:
	node_modules/.bin/istanbul cover _mocha -- -R spec
doc:
	node_modules/.bin/yuidoc
.PHONY: test test-cov doc
