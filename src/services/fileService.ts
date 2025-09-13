import { v4 as uuidv4 } from 'uuid';
import { docClient } from "../utils/dynamoClient";

const FILES_TABLE = process.env.FILES_TABLE || "EncodriveFiles";

export interface EncodriveFile {
  fileId: string; 
  userEmail: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Url: string;
  uploadedAt: string;
}

export const saveFileMetadata = async (fileData: Omit<EncodriveFile, 'fileId'>) => {
  const fileId = uuidv4(); // Generate unique file ID

  const file: EncodriveFile = {
    fileId, 
    ...fileData
  };

  await docClient.put({
    TableName: FILES_TABLE,
    Item: file
  }).promise();

  return file;
};

export const getFilesByUserEmail = async (userEmail: string) => {
  // Use SCAN (inefficient) or create a GSI for better performance
  const result = await docClient.scan({
    TableName: FILES_TABLE,
    FilterExpression: "userEmail = :email",
    ExpressionAttributeValues: {
      ":email": userEmail
    }
  }).promise();

  return result.Items || [];
};

export const getFileByUrl = async (s3Url: string) => {
  try {
    const result = await docClient.scan({
      TableName: FILES_TABLE,
      FilterExpression: "s3Url = :url",
      ExpressionAttributeValues: { ":url": s3Url }
    }).promise();

    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error('Error getting file by URL:', error);
    throw error;
  }
};