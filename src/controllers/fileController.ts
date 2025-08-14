import { Request, Response } from "express";
import { findUserByApiKey } from "../services/userService";
import { saveFileMetadata } from "../services/fileService";
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
