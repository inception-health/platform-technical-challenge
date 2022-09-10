import * as process from "process";
import { APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, DescribeTableCommand, PutItemCommand, GetItemCommand, AttributeValue } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME
const REGION = process.env.REGION;

const ddbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const numberOfPatients = 10;
const patientIds = [...Array(numberOfPatients).keys()].map((i) => i + 1).map((i) => `patient-${i}`);

export const checkin = async (): Promise<void> => {
  const patientId = getRandomElement(patientIds);
  const now = new Date()
  const item = {
    "checkinTime": { S: now.toJSON()},
    "id": { S: patientId},
  };
  
  await ddbDocClient.send(new PutItemCommand({
    TableName: TABLE_NAME,
    Item: item,
  }));
}

export const backend = async (): Promise<APIGatewayProxyResult> => {
  try {
    await describeTable(TABLE_NAME);
  } catch (e) {
    return response(500, {error: `Failed to describe Dynamodb table. Looked for '${TABLE_NAME}'.`, details: e})
  }

  try {
    const lastCheckins = await getLastestCheckins();
    return response(200, {message: "checkins", lastCheckins});
  }
  catch (e) {
    console.log("exception getting checkin data", e);
    if (e.name === "AccessDeniedException") {
      return response(500, {error: `Access Denied trying to read from '${TABLE_NAME}'.`, details: e});
    }
    return response(500, {error: `Unknown error trying to read from '${TABLE_NAME}'.`, details: e});
  }
};

async function getCheckin(id: string): Promise<Record<string, AttributeValue>> {
  const command = new GetItemCommand({
    TableName: TABLE_NAME,
    Key: {"id": { S: id }},
  });
  const output = await ddbClient.send(command);
  const item = output.Item!;
  return item;
}

async function getLastestCheckins(): Promise<Record<string, any>> {
  const lastCheckins = {};
  for (const key in patientIds) {
    const id = patientIds[key]
    const data = await getCheckin(id);
    if (! data) {
      lastCheckins[id] = "Never"
    } else {
      lastCheckins[id] = new Date(data["checkinTime"]["S"]!).toUTCString();
    }
  }
  return lastCheckins;
}

async function describeTable(tableName) {
  const command = new DescribeTableCommand({
    TableName: tableName,
  });
  const response = await ddbClient.send(command);
  const table = response.Table;
  return table;
}

function response(code, data) {
  return {
    statusCode: code,
    isBase64Encoded: false,
    body: JSON.stringify(data)
  }
}

function getRandomElement(items): string {
  const i = Math.floor(Math.random() * items.length);
  return items[i];
}