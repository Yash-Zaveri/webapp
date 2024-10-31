import { S3 } from '@aws-sdk/client-s3'; // Import S3 client from v3 SDK
import dotenv from 'dotenv'; // Import dotenv for environment variables
dotenv.config(); // Load environment variables from .env file

const s3 = new S3({ region: process.env.AWS_REGION }); // Use environment variable for region
const bucketName = process.env.BUCKET_NAME; // Use environment variable for bucket name

// Function to upload or update a profile picture
export const uploadProfilePicture = async (userId, file) => {
    const s3Params = {
        Bucket: bucketName,
        Key: `${userId}/profile-pic-${userId}`, // Organize by userId with a fixed profile pic name
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    const result = await s3.putObject(s3Params); // Use putObject for uploading
    return {
        file_name: file.originalname,
        id: result.ETag,
        url: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Params.Key}`, // Generate URL
        upload_date: new Date().toISOString().split('T')[0],
        user_id: userId,
    };
};

export const deleteProfilePicture = async (userId) => {
    // List all objects under the user's folder in S3
    const listParams = {
        Bucket: bucketName,
        Prefix: `${userId}/`, // Prefix to get all files within the user's folder
    };

    // Get all objects in the user's folder
    const listedObjects = await s3.listObjectsV2(listParams);

    if (listedObjects.Contents.length === 0) return; // No files to delete

    // Create delete parameters for all objects under the user's folder
    const deleteParams = {
        Bucket: bucketName,
        Delete: { Objects: listedObjects.Contents.map(({ Key }) => ({ Key })) },
    };

    // Delete all objects in the user's folder
    return await s3.deleteObjects(deleteParams);
};

// Function to retrieve a profile picture
export const getProfilePicture = async (userId) => {
    const imageKey = `${userId}/profile-pic-${userId}`; // Ensure correct naming
    const s3Params = {
        Bucket: bucketName,
        Key: imageKey,
    };

    const data = await s3.getObject(s3Params);
    return data.Body; // Return the file body (buffer)
};
