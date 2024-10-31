import StatsD from 'node-statsd';

const client = new StatsD({
  host: 'localhost',
  port: 8125
});

export default client;
