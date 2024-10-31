import client from '../services/statsdClient.js';

const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  console.log(`api.${req.method}.${req.route.path}`);
  // Increment the counter for the API call
  client.increment(`api.${req.method}.${req.route.path}`);
  console.log(`api.${req.method}.${req.route.path}`);
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Record the API call duration
    client.timing(`api.${req.method}.${req.route.path}.time`, duration);
  });

  next();
};

export default metricsMiddleware; // Use ES module export
