import { v4 as uuidv4 } from 'uuid';
import { encryptAPIKey, decryptAPIKey } from '../utils/apiKeyUtil';
import { docClient } from '../utils/dynamoClient';

const USERS_TABLE = process.env.USERS_TABLE || 'EncodriveUsers';

export const findOrCreateUser = async (email: string) => {
  const user = await docClient.get({
    TableName: USERS_TABLE,
    Key: { email },
  }).promise();

  if (user.Item) return user.Item;

  const apiKey = `encodrive_live_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const encryptedApiKey = encryptAPIKey(apiKey);

  const newUser = {
    email,
    apiKey: encryptedApiKey,
    createdAt: new Date().toISOString(),
    plan: 'free',
  };

  await docClient.put({
    TableName: USERS_TABLE,
    Item: newUser,
  }).promise();

  return newUser;
};

export const getUserByEmail = async (email: string) => {  
  const user = await docClient.get({
    TableName: USERS_TABLE,
    Key: { email },
  }).promise();

  if (!user.Item) return null;

  return {
    ...user.Item,
    apiKey: decryptAPIKey(user.Item.apiKey),
  };
};

export const findUserByApiKey = async (apiKey: string) => {
  const user = await docClient.get({
    TableName: USERS_TABLE,
    Key: { apiKey },
  }).promise();

  if (!user.Item) return null;

  return user.Item;
};