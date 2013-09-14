-- keyspace
CREATE KEYSPACE casson_test
   WITH REPLICATION = {'class' : 'SimpleStrategy', 'replication_factor': 1};

-- user
CREATE USER u_tester with password 'pw_test';

-- permiissions (necessary if using CassandraAuthorizer)
GRANT MODIFY ON KEYSPACE casson_test TO u_tester;
GRANT SELECT ON KEYSPACE casson_test TO u_tester;
