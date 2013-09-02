var util = require('util');
var casson = require('casson');

// Use getstarted.cql to setup Cassandra and have it running
// If not on localhost:9042, adjust the following accordingly
var pool = new casson.Pool({hosts    : ['localhost:9042'],
                            keyspace : 'casson_getstarted_ks',
                            username : 'u_getstarted',
                            password : 'pw_getstarted' });

// NOTE: setTimeout is to deal setup and creation delays.

// Creating tables
var t1 = new casson.Table.construct(
  'T1', { 'a' : 3, 'b' : 'a string',
          '_PRIMARY_KEYS' : [ 'a', 'b' ] });
var t2 = new casson.Table.construct(
  'T2', { 'a' : 1, 'b' : [ 1 ], 'c' : { 'a': 'str'},
          '_PRIMARY_KEYS' : [ 'a' ]});
// Adding columns a la javascript
t1.c = 3.1415926;

setTimeout (function() {

  pool.sendQuery(t1);
  pool.sendQuery(t2);
}, 2000);

setTimeout (function() {
  // Inserting data
  var i1 = new casson.Query.Insert(t1, { 'a' : 1, 'b' : 'foo' });
  var i2 = new casson.Query.Insert('T1', { 'a' : 2, 'b' : 'bar', 'c' : 3.1 });
  var i3 = new casson.Query.Insert(t2, { 'a' : 3, 'b' : [ 2, 3, 4, 5 ],
                                         'c' : { 'p' : 'some', 'q' : 'string' }});
  var i4 = new casson.Query.Insert('T2', { 'a' : 4, 'b' : [ 2222, 44444 ],
                                           'c' : { 'p' : 'another', 'q' : 'one' }});

  pool.sendQuery(i1);
  pool.sendQuery(i2);
  pool.sendQuery(i3);
  pool.sendQuery(i4);
}, 3000);

setTimeout (function() {
  // Update
  var u = new casson.Query.Update(t2, {'b' : {'list+' : [6]}}).where({'a' : 3});
  pool.sendQuery(u);
}, 3050);

setTimeout (function() {
  // Doing selects
  var s1 = new casson.Query.Select(t1).where({'a' : 1});
  pool.sendQuery(s1, function(err, result) {
    console.log(result[0].instance());
  });

  // result: { null : c, foo : b, 1 : a }

  var s2 = new casson.Query.Select(t2, ['a', 'c']);
  pool.sendQuery(s2, function(err, result) {
    console.log(util.inspect(result['rows']));
  }, null, true);

  // result: [ [ 4, { p: 'another', q: 'one' } ],
  //           [ 3, { p: 'some', q: 'string' } ] ]

}, 3100);


// the results

// Cleanup
function cleanup() {
  pool.sendQuery(t1.dbDrop());
  pool.sendQuery(t2.dbDrop());
}
