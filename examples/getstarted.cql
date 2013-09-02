-- keyspace
CREATE KEYSPACE casson_getstarted_ks
   WITH REPLICATION = {'class' : 'SimpleStrategy', 'replication_factor': 1};

-- user
CREATE USER u_getstarted with password 'pw_getstarted';

-- permiissions (necessary if using CassandraAuthorizer)
GRANT CREATE ON KEYSPACE casson_getstarted_ks TO u_getstarted;
GRANT DROP ON KEYSPACE casson_getstarted_ks TO u_getstarted;
GRANT MODIFY ON KEYSPACE casson_getstarted_ks TO u_getstarted;
GRANT SELECT ON KEYSPACE casson_getstarted_ks TO u_getstarted;
