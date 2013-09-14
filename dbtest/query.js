var assert = require('assert'),
    Frame = require('../lib/frame'),
    Table = require('../lib/table'),
    Q = require('../lib/query'),
    Pool = require('../lib/pool')

describe('Table ', function() {
  var opts = {'host' : 'localhost', 'port' : 9042, 'retry_t' : 1000};
  var uk = new Frame('Query', "USE casson_test2");
  var t1 = Table.construct('TestTable',
                           {'a' : 1, 'b' : 'str', 'c' : 2.5,
                            'd' : 'clusterkey',
                            'e' : '62c36092-82a1-3a00-93d1-46196ee77204',
                            '_PRIMARY_KEYS' : ['e', 'd']})
  var c;
    c = new Pool.Connector(opts);
    setTimeout(function() {
      (new Frame('Startup')).send(1, c);
    }, 50);
    setTimeout(function() {uk.send(2, c); }, 75);
  setTimeout(function() {
    (new Frame('Query', t1.dbCreate())).send(3, c);}, 100);

  beforeEach(function(done) {
    c = new Pool.Connector(opts);
    setTimeout(function() {
      (new Frame('Startup')).send(4, c);
    }, 50);
    setTimeout(function() {uk.send(5, c); done();}, 75);
  });

  describe('Insert', function() {
    it('one', function(done) {
      c.conn.on('result', function(v, result) {
          done();
      });
      var i1 = new Insert(t1, {'a' : 2, 'b' : 'str2', 'c' : 2.5, 'd' : 'ck2',
                               'e' : '62c36092-82a1-3a00-93d1-46196ee77204'});
      setTimeout(function() {
        (new Frame('Query', i1.dbCreate())).send(6, c);}, 100);
    });
  });
})