import express from "express";
import bcrypt from "bcrypt";
import User from "../user/User.js";
import { body, checkExact, validationResult } from "express-validator";
import sequelize from '../config/db.js';
import multer from "multer"; // New import for handling file uploads
import { uploadProfilePicture, deleteProfilePicture, getProfilePicture } from "../services/s3Service.js"; // Updated import for S3 operations
import Image from "../user/Image.js"; // Import the Image model for database interactions
//import metricsMiddleware from '../middleware/metricsMiddleware.js'; // Import the metrics middleware
import logger from '../services/logger.js'; // Import logger utility
import client from '../services/statsdClient.js'; // Import metrics client
import { setSuccessResponse, setErrorResponse } from '../services/responseUtil.js'; // Create a separate file for response utility functions
import crypto from "crypto";
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'; // Correct import syntax
const snsClient = new SNSClient({ region: process.env.AWS_REGION }); // Replace 'your-region' with actual region
import { Op } from "sequelize";



const checkVerified = (req, res, next) => {

 if (!req.user.verified || req.user.verified === false) {
  logger.warn(`User ${req.user.email} attempted access without verification.`);
  return res.status(403).json({ message: "User account is not verified. Please check your email for verification link." });
 }
  next();
};


// Email Verification Function
const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    logger.warn("Verification failed: No token provided in query parameters");
    return res.status(400).json({ error: "Verification token is required" });
  }

  try {
    logger.info(`Received verification request for token: ${token}`);
    const user = await User.findOne({
      where: {
        verificationToken: token,
      },
    });

    if (!user) {
      logger.warn(
        `Verification failed: Invalid or expired token. Token: ${token}`
      );
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const currentTime = new Date().getTime();
    const veritime = new Date(user.verificationTokenExpiration).getTime();
    const veritimePlus2Minutes = veritime + 2 * 60 * 1000;
    const isExpired = currentTime > veritimePlus2Minutes;
    console.log(`AT email varification part expiration time ): ${user.verificationTokenExpiration}`);
    console.log(`Type of Retrieved Expiration: ${typeof user.verificationTokenExpiration}`); 
    console.log(`current time: ${Date()}`);
    console.log(`${currentTime}`);
    console.log(`${veritime}`);
    console.log(`${veritimePlus2Minutes}`);

    
        if (isExpired) {
          console.log('Verification token has expired.');
          return res.status(400).json({ message: "EXPIRED!" })
      } else {
    user.verified = true;
    user.verificationToken = null;
    user.verificationTokenExpiration = null;
    await user.save();

    logger.info(`User ${user.email} verified successfully`);
    return res.status(200).json({ message: "Email verified successfully" });
  }
  } catch (error) {
    logger.error(
      `Error during verification for token ${token}: ${error.message}`
    );

    logger.error("Error during verification:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
  
};


// Middlewares
const dbConnCheck = async (req, res, next) => {
  sequelize
    .query("SELECT 1")
    .then((result) => {
      next();
    })
    .catch((error) => {
      res.status(503).send();
    });
};

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  } else {
    return res.status(400).send(errors);
  }
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    res.setHeader("WWW-Authenticate", "Basic");
    res.status(401).send();
    return;
  }

  const encodedCredentials = authHeader.split(" ")[1];
  if (!encodedCredentials) {
    res.status(401).json({ error: "Authorization credentials missing" });
    return;
  }

  const decodedCredentials = Buffer.from(encodedCredentials, "base64").toString(
    "utf-8"
  );
  const [username, password] = decodedCredentials.split(":");

  if (!username || !password) {
    res.status(401).json({ error: "Username or password missing" });
    return;
  }

  User.findOne({
    where: {
      email: username,
    },
  })
    .then(async (result) => {
      if (result) {
        const passwordMatch = await bcrypt.compare(
          password,
          result.dataValues.password
        );
        if (passwordMatch) {
          req.user = result.dataValues;
          next();
        } else {
          res.setHeader("WWW-Authenticate", "Basic");
          res.status(401).send();
        }
      } else {
        res.status(404).send();
      }
    })
    .catch((err) => {
      res.status(400).send(err);
    });
};

// Create the router
const router = express.Router();

// Apply the metrics middleware to all routes
// router.use(metricsMiddleware);
// Create User API
router.post(
  "/v1/create-user",
  [
    body("email").notEmpty().withMessage("email is required").bail().isEmail(),
    body("password").notEmpty().withMessage("password is required"),
    body("firstName").notEmpty().withMessage("firstName is required"),
    body("lastName").notEmpty().withMessage("lastName is required"),
  ],
  validateRequest,
  dbConnCheck,
  async (req, res) => {
    client.increment('api.createUser.count');
    const apiStart = Date.now();

    try {
      logger.info("Creating user");

      // Check if the email already exists
      const existingUser = await User.findOne({ where: { email: req.body.email } });
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      logger.info("Not existing user user");
// Generate a verification token with expiration (2 minutes)
const verification_Token = crypto.randomBytes(20).toString("hex");
const verificationTokenExpires = new Date(Date.now() + 2 * 60 * 1000); // 2-minute expiration
logger.info("verificationToken user");
      // Hash the password and create the user
      const hash = await bcrypt.hash(req.body.password.toString(), 13);
      const dbStart = Date.now();
      const user = await User.create({
        email: req.body.email,
        password: hash,
        first_name: req.body.firstName,
        last_name: req.body.lastName,
        //verified: false, // Set verified status to false initially
        verificationToken: verification_Token, // Add this to your model
        verificationTokenExpiration: verificationTokenExpires
      });
      logger.info("perform user.create");
      client.timing('db.query.createUser', Date.now() - dbStart);

      
// error in this part of the code
// Publish message to SNS
if (process.env.SNS_TOPIC_ARN) {
  const snsMessage = {
    email: user.email,
    verificationToken: verification_Token,
        id : user.id,
  };

  const params = {
    Message: JSON.stringify(snsMessage),
    TopicArn: process.env.SNS_TOPIC_ARN,
  };
  logger.info("created param");
  try {
        await snsClient.send(new PublishCommand(params));
        logger.info(`SNS message published for user: ${user.email}`);
        client.increment("user.post.sns");
      } catch (snsError) {
        logger.error("Error publishing to SNS", snsError);
        // Handle SNS failure without affecting user creation
      }
    }
    else {
      logger.warn("SNS_TOPIC_ARN not defined in environment variables");
    }
      // Remove password from response
      delete user.dataValues.password;
      
      setSuccessResponse(user, res, 201);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(400).json({ message: "Email already exists" });
      }
      logger.error("Error creating user:", error);
    return res.status(500).send();
      
    } finally {
      client.timing('api.createUser.duration', Date.now() - apiStart);
    }
  }
);

router.get('/v1/user/self/verify', verifyEmail);


// Get User API
router.get(
  "/v1/get-user",
  validateRequest,
  dbConnCheck,
  authMiddleware,
  checkVerified, // New middleware to check verification
  async (req, res) => {
    client.increment('api.getUser.count');
    const apiStart = Date.now();
        try {
          delete req.user.password;
          logger.info("Getting user info.");
          setSuccessResponse(req.user, res, 200);
      } catch (error) {
          logger.error("Error fetching user: ", error);
          setErrorResponse(error, res, 400);
      } finally {
          client.timing('api.getUser.duration', Date.now() - apiStart);
      }
  }
);

// Update User API
router.put(
  "/v1/update-user",
  [
      body("password").notEmpty().withMessage("password is required"),
      body("firstName").notEmpty().withMessage("firstName is required"),
      body("lastName").notEmpty().withMessage("lastName is required"),
  ],
  validateRequest,
  dbConnCheck,
  authMiddleware,
  checkVerified, // New middleware to check verification
  async (req, res) => {
      client.increment('api.updateUser.count');
      const apiStart = Date.now();

      try {
          const toUpdate = {
              password: await bcrypt.hash(req.body.password, 13),
              first_name: req.body.firstName,
              last_name: req.body.lastName,
          };

          const dbStart = Date.now();
          await User.update(toUpdate, { where: { id: req.user.id } });
          logger.info("Updatinging user");
          client.timing('db.query.updateUser', Date.now() - dbStart);

          res.status(204).send();
      } catch (error) {
          logger.error("Error updating user: ", error);
          setErrorResponse(error, res, 400);
      } finally {
          client.timing('api.updateUser.duration', Date.now() - apiStart);
      }
  }
);

// New code for S3 operations begins here

// Configure multer for file uploads
const upload = multer(); // Initialize multer for file uploads

// Route to upload or update a profile picture
router.post("/v1/user/self/pic", authMiddleware, upload.single("profilePic"), checkVerified, async (req, res) => {
  try {
    logger.info("Upload profile picture request");
    client.increment('post.user.profilepic.upload');

    if (!req.file) {
      logger.error("No file selected to upload");
      return setErrorResponse({ message: "File is not uploaded. Please upload one!" }, res, 400);
    }

    if (!req.file.mimetype.includes("image/")) {
      logger.error("File format selected is not supported");
      return setErrorResponse({ message: "Given file type not supported!" }, res, 400);
    }
    const dbStart = Date.now();
    const existingImage = await Image.findOne({ where: { user_id: req.user.id } });
    client.timing('db.query.findUserImage', Date.now() - dbStart);

    if (existingImage) {
      logger.error("User already has a profile picture");
      return setErrorResponse({ message: "User has already uploaded a profile picture" }, res, 400);
    }

    const s3Start = Date.now();
    const result = await uploadProfilePicture(req.user.id, req.file);
    client.timing('s3.uploadProfilePicture', Date.now() - s3Start);

    const dbInsertStart = Date.now();
    const imageRecord = await Image.create({
      file_name: req.file.originalname,
      id: result.id,
      url: result.url,
      upload_date: new Date(),
      user_id: req.user.id,
    });
    client.timing('db.query.insertImageRecord', Date.now() - dbInsertStart);

    logger.info("Profile picture uploaded successfully");
    setSuccessResponse(imageRecord, res, 201);
  } catch (error) {
    logger.error("Failed to upload profile picture: ", error);
    setErrorResponse({ error: "Failed to upload or update profile picture" }, res, 400);
  } finally {
    client.timing('api.uploadProfilePic.duration', Date.now() - apiStart);
  }
});



// Route to delete a profile picture
router.delete("/v1/user/self/pic", authMiddleware, checkVerified, async (req, res) => {
  client.increment('api.deleteProfilePic.count');
  const apiStart = Date.now();

  try {
    logger.info("Delete profile picture request");

    const dbStart = Date.now();
    const imageRecord = await Image.findOne({ where: { user_id: req.user.id } });
    client.timing('db.query.findUserImage', Date.now() - dbStart);

    if (!imageRecord) {
      logger.error("Profile picture not found");
      return setErrorResponse({ error: "Profile picture not found" }, res, 404);
    }

    const s3Start = Date.now();
    await deleteProfilePicture(req.user.id);
    client.timing('s3.deleteProfilePicture', Date.now() - s3Start);

    const dbDeleteStart = Date.now();
    await Image.destroy({ where: { user_id: req.user.id } });
    client.timing('db.query.deleteImageRecord', Date.now() - dbDeleteStart);

    logger.info("Profile picture deleted successfully");
    setSuccessResponse(null, res, 204);
  } catch (error) {
    logger.error("Failed to delete profile picture: ", error);
    setErrorResponse({ error: "Failed to delete profile picture" }, res, 400);
  } finally {
    client.timing('api.deleteProfilePic.duration', Date.now() - apiStart);
  }
});


// Route to retrieve a profile picture
router.get("/v1/user/self/pic", authMiddleware, checkVerified, async (req, res) => {
  client.increment('api.getProfilePic.count');
  const apiStart = Date.now();

  try {
    logger.info("Retrieve profile picture request");

    const dbStart = Date.now();
    const imageRecord = await Image.findOne({ where: { user_id: req.user.id } });
    client.timing('db.query.findUserImage', Date.now() - dbStart);

    if (imageRecord) {
      setSuccessResponse(imageRecord, res, 200);
    } else {
      setErrorResponse({ error: "Profile picture not found" }, res, 404);
    }
  } catch (error) {
    logger.error("Failed to retrieve profile picture: ", error);
    setErrorResponse({ error: "Failed to retrieve profile picture" }, res, 400);
  } finally {
    client.timing('api.getProfilePic.duration', Date.now() - apiStart);
  }
});

// New code for S3 operations ends here

router.patch("*", [checkExact()],  async (req, res) => {
    res.status(405).send();
});
  
router.delete("*", [checkExact()], async (req, res) => {
    res.status(405).send();
});
  
router.head("*", [checkExact()],  async (req, res) => {
    res.status(405).send();
});

router.options("*", [checkExact()], async (req, res) => {
    res.status(405).send();
});

export default router;
