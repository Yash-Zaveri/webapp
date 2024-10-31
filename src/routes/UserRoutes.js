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
      const hash = await bcrypt.hash(req.body.password.toString(), 13);
      const dbStart = Date.now();
      const user = await User.create({
        email: req.body.email,
        password: hash,
        first_name: req.body.firstName,
        last_name: req.body.lastName,
      });

      client.timing('db.query.createUser', Date.now() - dbStart);

      delete user.dataValues.password;
      setSuccessResponse(user, res, 201);
    } catch (error) {
      logger.error("Error creating user: ", error);
      setErrorResponse(error, res, 400);
    }
    finally {
      client.timing('api.createUser.duration', Date.now() - apiStart);
  }
  }
);


// Get User API
router.get(
  "/v1/get-user",
  validateRequest,
  dbConnCheck,
  authMiddleware,
  async (req, res) => {
    client.increment('api.getUser.count');
    const apiStart = Date.now();
        try {
          delete req.user.password;
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
router.post("/v1/user/self/pic", authMiddleware, upload.single("profilePic"), async (req, res) => {
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
router.delete("/v1/user/self/pic", authMiddleware, async (req, res) => {
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
router.get("/v1/user/self/pic", authMiddleware, async (req, res) => {
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
