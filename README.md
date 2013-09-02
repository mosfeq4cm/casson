
# Casson

`Casson` is a *ODM (Object Data Model)* for `Apache Cassandra` using native
CQL protocol.

The main goal is to make it simple to use, take advantage of the power of
Cassandra cluster, and allow the more sophisticated capabilities of
Cassandra to be available.  The secondary goal to have high performance
(necessary for real-time work we do) without too much sanity checking.  Now
we have an opportunity to start with a completely asynchronous package.  It
may help to easily transition to Cassandra and Node.js combination.

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

-   Implement `Batch` CQL command.

## Contributors

Currently, I wrote this to do what we need to do, but it
would be delightful when others make it better.

## Liscense

`casson` is distributed with [Apache License, Version 2.0](http://www.apache.org/licenses/).
