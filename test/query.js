var assert = require('assert'),
    Table = require('../lib/table'),
    Query = require('../lib/query');

describe('Queries: ', function() {
  describe('Select - ', function() {
    it('* ', function() {
      var s = new Select('atable');
      assert.equal(s.qstr, 'SELECT * FROM atable');
    })
    it('* with table and uuid key', function() {
      var t = Table.construct('TestTable',
                              {a : 3, b : 'str',
                               c : '62c36092-82a1-3a00-93d1-46196ee77204',
                               d : 1.2, _PRIMARY_KEYS : ['c', 'a']});
      var s = new Select(t).where(
        {'c' : '62c36092-82a1-3a00-93d1-46196ee77204'});
      assert.equal(s.wstr,
                   ' WHERE c = 62c36092-82a1-3a00-93d1-46196ee77204');
      assert.equal(s.qstr, 'SELECT * FROM TestTable');
    })
    it('some columns', function() {
      var s = new Select('atable', ['a', 'b', 'c']);
      assert.equal(s.qstr, 'SELECT a,b,c FROM atable');
    })
    it('some  with simple where', function() {
      var s = new Select('atable').where({'a' : 1});
      assert.equal(s.wstr, ' WHERE a = 1');
    })
    it('some  with more complex where', function() {
      var s = new Select('atable').where({'a' : {'>' : 3, '<=' : 9}});
      assert.equal(s.wstr, ' WHERE a > 3 AND a <= 9');
    })
    it('some with two vars in where ', function() {
      var s = new Select('atable').where({'a' : 1, 'b' : 2.4});
      assert.equal(s.wstr, ' WHERE a = 1 AND b = 2.4');
    })
    it('some with where and IN ', function() {
      var s = new Select('atable').where({'a' : [1, 2, 5]});
      assert.equal(s.wstr, ' WHERE a IN [1,2,5]');
    })
    it('some with order by', function() {
      var s = new Select('atable').orderby({'a' : 'asc', 'b' : 'desc'});
      assert.equal(s.ostr, ' ORDER BY a ASC, b DESC');
    })
    it('some with limit', function() {
      var s = new Select('atable').limit(8);
      assert.equal(s.lstr, ' LIMIT 8');
    })
    it('some with allow filtering', function() {
      var s = new Select('atable').where({'a' : 1}).allowFiltering();
      assert.equal(s.astr, ' ALLOW FILTERING');
    })
  })
  describe('Insert - ', function() {
    it('insert int, text, uuid', function() {
      var i = new Insert(
        'atable', {a : 1, b : 'str',
                   c : '62c36092-82a1-3a00-93d1-46196ee77204'});
      assert.equal(i.istr, 'INSERT INTO atable(a,b,c)  VALUES (1,\'str\',62c36092-82a1-3a00-93d1-46196ee77204)');
      assert.equal(i.istrp, 'INSERT INTO atable(a,b,c)  VALUES (?,?,?)');
    })
    it('insert into a table with using', function() {
      var t = Table.construct('TestTable',
                              {a : 3, b : 'str',
                               d : 1.2, _PRIMARY_KEYS : ['a']});
      var s = new Insert(t, {a : 1, b : 'str'}).using(
        {'ttl': 1234, 'timestamp' : 1376206853263});
      assert.equal(s.istr, 'INSERT INTO TestTable(a,b)  VALUES (1,\'str\')');
      assert.equal(s.ustr, ' USING TTL 1234 AND TIMESTAMP 1376206853263');
    })
  })
  describe('Update - ', function() {
    it('update int, text, uuid', function() {
      var u = new Update(
        'atable', {a : 1, b : 'str',
                   c : '62c36092-82a1-3a00-93d1-46196ee77204'});
      assert.equal(u.pstr, 'UPDATE atable');
      assert.equal(u.sstr, ' SET a = 1, b = \'str\', c = 62c36092-82a1-3a00-93d1-46196ee77204');
      assert.equal(u.sstrp, ' SET a = ?, b = ?, c = ?');
    })
    it('update with where', function() {
      var u = new Update('atable', {a : 1, b : 'str'}).where(
        {c : '62c36092-82a1-3a00-93d1-46196ee77204'});
      assert.equal(u.wstr, ' WHERE c = 62c36092-82a1-3a00-93d1-46196ee77204');
      assert.equal(u.wstrp, ' WHERE c = ?');
    })
    it('update a table', function() {
      var t = Table.construct('TestTable',
                              {a : 3, b : 'str',
                               d : 1.2, _PRIMARY_KEYS : ['a']});
      var u = new Update(
        t, {a : 1, b : 'str',
                   c : '62c36092-82a1-3a00-93d1-46196ee77204'});
      assert.equal(u.pstr, 'UPDATE TestTable');
      assert.equal(u.sstr, ' SET a = 1, b = \'str\', c = 62c36092-82a1-3a00-93d1-46196ee77204');
    })
    it('update a table with primary key restriction', function() {
      var t = Table.construct('TestTable',
                              {a : 3, b : 'str',
                               d : 1.2, _PRIMARY_KEYS : ['a']});
      var u = new Update(t, {b : 'another'}).where({a : 3}, true);
      assert.equal(u.pstr, 'UPDATE TestTable');
      assert.equal(u.sstr, ' SET b = \'another\'');
      assert.equal(u.wstr, ' WHERE a = 3');
    })
    it('update a table with NON primary key', function() {
      var t = Table.construct('TestTable',
                              {a : 3, b : 'str',
                               d : 1.2, _PRIMARY_KEYS : ['a']});
      var u = new Update(t, {b : 'another'}).where({b : 3}, true);
      assert.equal(u.toString(), 'Error: Not a primary key: b');
    })
  })
  describe('Delete - ', function() {
    it('delete a column with primary key restriction', function() {
      var t = Table.construct('TestTable',
                              {a : 3, b : 'str',
                               d : 1.2, _PRIMARY_KEYS : ['a']});
      var d = new Delete(t, ['b']).where({a : 3}, true);
      assert.equal(d.dstr, 'DELETE b FROM TestTable');
      assert.equal(d.wstr, ' WHERE a = 3');
    })
    it('Update a column with NON primary key', function() {
      var t = Table.construct('TestTable',
                              {a : 3, b : 'str',
                               d : 1.2, _PRIMARY_KEYS : ['a']});
      var d = new Update(t, {'b' : 'another'}).where({'b' : 3}, true);
      assert.equal(d.toString(), 'Error: Not a primary key: b');
    })
  })
  describe('Update Collection - ', function() {
    var t3 = Table.construct('TestTable3',
                             {'a' : 1, 'blist' : [], 'cmap' : {},
                              '_PRIMARY_KEYS' : ['a']})
    describe(' list ', function() {
      it(' = ', function() {
        var u = new Update(t3, {'blist' : {'list=' : ['a', 'b']}}).where({'a' : 2});
        assert.equal(u.sstr, ' SET blist = [\'a\',\'b\']');
        assert.equal(u.sstrp, ' SET blist = ? ');
      });
      it(' append ', function() {
        var u = new Update(t3, {'blist' : {'list+' : ['c']}}).where({'a' : 2});
        assert.equal(u.sstr, ' SET blist = blist + [\'c\']');
        assert.equal(u.sstrp, ' SET blist = blist + ? ');
      });
      it(' prepend ', function() {
        var u = new Update(t3, {'blist' : {'+list' : ['d']}}).where({'a' : 2});
        assert.equal(u.sstr, ' SET blist = [\'d\'] + blist ');
        assert.equal(u.sstrp, ' SET blist = ? + blist ');
      });
      it(' remove ', function() {
        var u = new Update(t3, {'blist' : {'list-' : ['b']}}).where({'a' : 2});
        assert.equal(u.sstr, ' SET blist = blist - [\'b\']');
        assert.equal(u.sstrp, ' SET blist = blist - ? ');
      });
    });
    describe(' set ', function() {
      it(' = ', function() {
        var u = new Update(t3, {'blist' : {'set=' : ['a', 'b']}}).where({'a' : 2});
        assert.equal(u.sstr, ' SET blist = {\'a\',\'b\'}');
        assert.equal(u.sstrp, ' SET blist = ? ');
      });
      it(' add ', function() {
        var u = new Update(t3, {'blist' : {'set+' : ['c']}}).where({'a' : 2});
        assert.equal(u.sstr, ' SET blist = blist + {\'c\'}');
        assert.equal(u.sstrp, ' SET blist = blist + ? ');
      });
      it(' remove ', function() {
        var u = new Update(t3, {'blist' : {'set-' : ['b']}}).where({'a' : 2});
        assert.equal(u.sstr, ' SET blist = blist - {\'b\'}');
        assert.equal(u.sstrp, ' SET blist = blist - ? ');
      });
    });
    describe(' map ', function() {
      it(' = ', function() {
        var u = new Update(t3, {'cmap' : {'map=' : {'a' : 'b'}}}).where({'a' : 3});
        assert.equal(u.sstr, ' SET cmap = {\'a\' : \'b\'}');
        assert.equal(u.sstrp, ' SET cmap = ? ');
      });
      it(' add ', function() {
        var u = new Update(t3, {'cmap' : {'map+' : {'p' : 'q'}}}).where({'a' : 3});
        assert.equal(u.sstr, ' SET cmap = cmap + {\'p\' : \'q\'}');
        assert.equal(u.sstrp, ' SET cmap = cmap + ? ');
      });
    });
  });
})
