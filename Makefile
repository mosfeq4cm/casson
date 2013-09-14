test:
	node_modules/.bin/mocha test/*.js
db-test:
	node_modules/.bin/mocha  --timeout 10000  dbtest/table.js dbtest/pool.js
test-cov:
	node_modules/.bin/istanbul cover _mocha -- -R spec --timeout 10000 test/*.js dbtest/table.js dbtest/pool.js
doc:
	node_modules/.bin/yuidoc
.PHONY: test test-cov doc
