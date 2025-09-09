import { Request, Response } from "express";
import { findUserByApiKey } from "../services/userService";
import { saveFileMetadata,getFileByUrl } from "../services/fileService";
import { s3 } from "../utils/s3";

export const generateUploadUrl = async (req: Request, res: Response) => {
  const { apiKey, fileName, fileType, fileSize } = req.body;

  if (!apiKey || !fileName || !fileType || !fileSize) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const user = await findUserByApiKey(apiKey);
  if (!user) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const s3Key = `uploads/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, "-")}`;
  const uploadURL = await s3.getSignedUrlPromise("putObject", {
    Bucket: process.env.S3_BUCKET,
    Key: s3Key,
    ContentType: fileType,
    Expires: 60 * 5
  });

  const s3Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

  await saveFileMetadata({
    userEmail: user.email,
    fileName,
    fileType,
    fileSize,
    s3Url,
    uploadedAt: new Date().toISOString()
  });

  return res.json({ uploadURL, s3Url });
};

// controllers/fileController.ts
export const getFileMetadata = async (req: Request, res: Response) => {
  try {
    const { apiKey, fileUrl } = req.body;

    if (!apiKey || !fileUrl) {
      return res.status(400).json({ error: "Missing required fields: apiKey and fileUrl" });
    }

    // Validate API key
    const user = await findUserByApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    // Get file metadata
    const fileMetadata = await getFileByUrl(fileUrl); // or getFileByUrlScan
    
    if (!fileMetadata) {
      return res.status(404).json({ error: "File not found" });
    }

    // Optional: Verify the user owns this file
    if (fileMetadata.userEmail !== user.email) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Return the metadata (excluding sensitive fields if any)
    const { fileId, fileName, fileType, fileSize, uploadedAt, userEmail } = fileMetadata;
    res.json({
      fileId,
      fileName,
      fileType,
      fileSize,
      uploadedAt,
      userEmail
    });

  } catch (error) {
    console.error('Error in getFileMetadata:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};