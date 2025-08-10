import { docClient } from "../utils/dynamoClient";

const FILES_TABLE = process.env.FILES_TABLE || "EncodriveFiles";

export interface EncodriveFile {
  userEmail: string;
  fileName: string;
  fileType: string;
  fileSize: number; // bytes
  s3Url: string;
  uploadedAt: string;
}

export const saveFileMetadata = async (file: EncodriveFile) => {
  await docClient.put({
    TableName: FILES_TABLE,
    Item: file
  }).promise();

  return file;
};

export const getFilesByUserEmail = async (userEmail: string) => {
  const result = await docClient.query({
    TableName: FILES_TABLE,
    KeyConditionExpression: "userEmail = :email",
    ExpressionAttributeValues: {
      ":email": userEmail
    }
  }).promise();

  return result.Items || [];
};
