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
  try {
    console.log('Searching for user with API key:', apiKey);
    
    // Scan ALL users from the database
    const result = await docClient.scan({
      TableName: USERS_TABLE,
    }).promise();

    console.log('Total users in database:', result.Items?.length || 0);

    if (!result.Items || result.Items.length === 0) {
      console.log('No users found in database');
      return null;
    }

    // Iterate through all users and decrypt their API keys
    for (const user of result.Items) {
      try {
        if (user.apiKey) {
          // Decrypt the stored API key
          const decryptedStoredKey = decryptAPIKey(user.apiKey);
          
          // Compare with the provided API key
          if (decryptedStoredKey === apiKey) {
            console.log('User found:', user.email);
            return user;
          }
        }
      } catch (decryptError) {
        console.warn(`Failed to decrypt API key for user ${user.email}:`, decryptError);
        // Continue checking other users
      }
    }

    console.log('No user found with matching API key');
    return null;

  } catch (error) {
    console.error('Error in findUserByApiKey:', error);
    throw error;
  }
};