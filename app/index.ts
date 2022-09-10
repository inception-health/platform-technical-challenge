import * as process from "process";
import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient, DescribeTableCommand, PutItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME
const REGION = process.env.REGION;

const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: false, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false, // false, by default.
};

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
};

const translateConfig = { marshallOptions, unmarshallOptions };

// Create the DynamoDB document client.
const ddbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, translateConfig);


export const emitter = async (event: any): Promise<void> => {
  const out = {
    "time": { S: Date.now().toString()},
    "id": { S: "challenge-app"},
  };
  console.log("event out", out);
  
  const cmd = new PutItemCommand({
    TableName: TABLE_NAME,
    Item: out,
  });
  
  const res = await ddbDocClient.send(cmd);
  console.log("res", res)
  return;
}

export const handler = async (
  _event: APIGatewayEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {

  const lastCheckin = await getCheckin("challenge-app")
  const checks = {
    "table": await checkTable(),
    "data": !! lastCheckin,
  };

  return successResponse({message: "status", checks, lastCheckin});
};

async function getCheckin(id: string) {
  const command = new GetItemCommand({
    TableName: TABLE_NAME,
    Key: {"id": { S: id }},
  });
  const response = await ddbClient.send(command);
  const item = response.Item;
  return item;
}

async function checkTable() {
  const command = new DescribeTableCommand({
    TableName: TABLE_NAME,
  });
  const response = await ddbClient.send(command);
  const table = response.Table;
  if (! table) {
    console.log("failed the table check")
  }
  return !! table
}

function errorResponse(data) {
  return response(500, data)
}

function successResponse(data) {
  return response(200, data)
}

function response(code, data) {
  return {
    statusCode: code,
    isBase64Encoded: false,
    body: JSON.stringify(data)
  }
}
