import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import colors from 'colors';
import sequelize from './src/config/db.js';
import healthzRoute from './src/routes/healthz.js'; 
import UserRoutes from './src/routes/UserRoutes.js'; 
import { checkConnection } from './src/config/db.js';

// Loading environment variables from .env file of my project
dotenv.config();
const app = express();
let server; // Declare a variable to hold the server

// CORS configuration
app.use(cors({
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'HEAD', 'OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json()); 
app.use(morgan('dev')); 

// Routing
app.use('', healthzRoute); // Route for health checks
app.use('/user', UserRoutes); // Route for user-related endpoints

// Catching all routes for 404 Not Found if no routes match
app.use((req, res) => {
  res.status(404).send();
});

// Function to close the server
export const closeServer = (done) => {
  if (server) {
    server.close(done);
  } else {
    done();
  }
};

// Connect to the database and start the server
const PORT = process.env.PORT || 5003;
checkConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`.green.bold);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to the database:', error.message.red.bold);
  });

  export default app;