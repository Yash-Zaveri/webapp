import express from 'express';
import { checkConnection } from '../config/db.js';
import { checkExact } from "express-validator";
import logger from '../services/logger.js'; // Import logger utility
import client from '../services/statsdClient.js'; // Import metrics client
const router = express.Router();

const checkPayload = (req, res, next) => {
  if (Object.keys(req.body).length > 0 || Object.keys(req.query).length > 0) {
    return res.status(400).send(); // 400 Bad Request if payload or parameters exist 
  }
  next();
};

// Health check route (GET) with payload check
router.get('/healthz', checkPayload, async (req, res) => {
  const isHealthy = await checkConnection(); // Check if database connection is healthy
  client.increment('api.healthz.count');
  const apiStart = Date.now();
  try{
    if (isHealthy) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    logger.info("Correct Healthz request.");
    return res.status(200).send(); // 200 OK if connected to the database
    
  } else {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    logger.error("Error cheking healthz: ", error);
    return res.status(503).send(); // 503 Service Unavailable if connection failed
  }
  }finally {
    client.timing('api.createUser.duration', Date.now() - apiStart);
}
});

router.post("/healthz", [checkExact()],  async (req, res) => {
    res.status(405).send();
  });
  
  router.put("/healthz", [checkExact()],  async (req, res) => {
    res.status(405).send();
  });
  
  router.patch("/healthz", [checkExact()],  async (req, res) => {
    res.status(405).send();
  });
  
  router.delete("/healthz", [checkExact()], async (req, res) => {
    res.status(405).send();
  });
  
  router.head("/healthz", [checkExact()],  async (req, res) => {
    res.status(405).send();
  });
  
  router.options("/healthz", [checkExact()], async (req, res) => {
    res.status(405).send();
  });

export default router;

