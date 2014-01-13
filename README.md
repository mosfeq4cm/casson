
# Casson

`Casson` is a *ODM (Object Data Model)* for `Apache Cassandra` using native
CQL protocol.

The main goal is to make it simple to use, take advantage of the power of
Cassandra cluster, and allow the more sophisticated capabilities of
Cassandra to be available.  The secondary goal to have high performance
(necessary for real-time work we do) without too much sanity checking.  Now
we have an opportunity to start with a completely asynchronous package.  It
may help to easily transition to Cassandra and Node.js combination.

## Getting Started

`Pool` is the entry point for `casson`.  It maintains connections to a host
or a cluster of hosts and has a `KeySpace` in which it operates.  Although
`KeySpace` can be created, `Pool` only sets up connections to use a
`KeySpace`.

Here is a simple way to set a couple of connections to a local Cassandra.
It assumes that we have the `KeySpace` already in Cassandra and have done:
`npm install casson`.

    var casson = require('casson');
    
    var pool = new casson.Pool({hosts    : ['localhost:9042'],
                                keyspace : 'casson_getstarted_ks',
                                username : 'u_getstarted',
                                password : 'pw_getstarted' });

With a pool in place, let's create a few tables:

    var t1 = new casson.Table.construct(
      'T1', { 'a' : 3, 'b' : 'a string',
              '_PRIMARY_KEYS' : [ 'a', 'b' ] });
    var t2 = new casson.Table.construct(
      'T2', { 'a' : 1, 'b' : [ 1 ], 'c' : { 'a': 'str'},
              '_PRIMARY_KEYS' : [ 'a' ]});

And there are good reasons to not have implicit `id` as the primary key.  We
can also add columns the old fashion way:

    t1.c = 3.1415926;

The data types are derived from the values, and we have the option to change
the defaults.  Please note that `b` is the clustering key for `t1`.

Let's have the tables in Cassandra:

    pool.sendQuery(t1);
    pool.sendQuery(t2);

We can have asynchrouse `callback` as an optional argument to `sendQuery`.

Tables need data:

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

Batches can be sent instead of individual UPDATEs/INSERTs/DELETEs:

    var b1 = new casson.Query.Batch();
    b1.addStatement(i1);
    b1.addStatement(i2);
    pool.sendQuery(b1);

So the javascript smoothly maps to the cassandra types, inlcuding collection
types like `List` and `Map`. 

Did we forget something in first the `List`:

    var u = new casson.Query.Update(t2, {'b' : {'list+' : [6]}}).where({'a' : 3});
    pool.sendQuery(u);

With data in tables, there is a demand for queries:

    var s1 = new casson.Query.Select(t1).where({'a' : 1});
      pool.sendQuery(s1, function(err, result) {
      console.log(result[0].instance());
    });
    
    // result: { c : null, b : foo, a : 1 }
    
    var s2 = new casson.Query.Select(t2, ['a', 'c']);
      pool.sendQuery(s2, function(err, result) {
      console.log(util.inspect(result['rows']));
    }, null, true);
    
    // result: [ [ 4, { p: 'another', q: 'one' } ],
    //           [ 3, { p: 'some', q: 'string' } ] ]

The `example` directory has the cql and js.  There are some timeouts to deal
with the some of the setup delays.

Isn't it tempting to think what else is possible.  Of course, the detailed
API should have the answer.  In case it doesn't, let's use the Wiki to
communicate concerns of general interest.

## Documentation

### API Documentation

It might be useful to browse the API documentation for further
clarification. [Casson API](http://www.fourthcoastmobility.com/casson-api/) is the place to go.

### Cassandra Documentation

Of course, to really take advantage of `casson`, it would be a really good
idea to a take a look at [Cassandra documentation](http://www.datastax.com/documentation/cassandra/1.2/webhelp/index.html).

## Dependencies

-   [`node-uuid`](https://npmjs.org/package/node-uuid) for uuid

-   [`dissolve`](https://npmjs.org/package/dissolve) for binary parsing

-   [`jsbn`](https://npmjs.org/package/jsbn) for handling big integers

-   [`mocha`](http://visionmedia.github.io/mocha/) for testing

-   [`istanbul`](https://npmjs.org/package/istanbul) for test coverage

-   [`YUIDoc`](http://yui.github.io/yuidoc/) for documentation

### Related software

They are also sources of good ideas and inspiration.

-   [`helenus`](https://npmjs.org/package/helenus)  a sophisticated CQL implementation with thrift

-   [`cql-protocol`](https://npmjs.org/package/cql-protocol): a basic CQL binary protocol handling

-   [`python-cql`](https://github.com/pcmanus/python-cql): I like Python and also this one.

## Status

It works well for our purpose.  In order to make it available for general
use, however, a few things we don't actively use had to be included along
with a few changes.

We can use Issues and Wiki section to get the process going
for now.

## To Do


## Contributors

Currently, I wrote this to do what we need to do, but it
would be delightful when others make it better.

## Liscense

`casson` is distributed with [Apache License, Version 2.0](http://www.apache.org/licenses/).
