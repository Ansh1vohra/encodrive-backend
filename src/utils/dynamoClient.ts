import { DynamoDB } from 'aws-sdk';

export const docClient = new DynamoDB.DocumentClient({
  region: 'ap-south-1',
});
