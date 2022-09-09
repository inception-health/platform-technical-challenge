import * as process from "process";
import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";

import ApolloClient from 'apollo-boost';
import fetch from 'cross-fetch';
import gql from 'graphql-tag';
import * as starwars from "@skyra/star-wars-api";
import type { Query, QueryGetFuzzyPersonArgs, QueryGetPersonArgs } from "@skyra/star-wars-api";

type StarWarsGraphqlApiResponse<K extends keyof Omit<Query, '__typename'>> = Record<K, Omit<Query[K], '__typename'>>;

export const handler = async (
  _event: APIGatewayEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {

  const REGION = process.env.REGION;
  const TABLE_NAME = process.env.DYNAMO_TABLE_NAME
  const STARWARS_API_URL = process.env.STARWARS_API_URL

  const apolloClient = new ApolloClient({
    uri: STARWARS_API_URL,
    fetch
  });

  const checks = {
    "table": false,
    "starwars": false,
  };

  const client = new DynamoDBClient({ region: REGION });
  const command = new DescribeTableCommand({
    TableName: TABLE_NAME,
  });
  const response = await client.send(command);
  const table = response.Table;
  if (! table) {
    // return errorResponse({error: "dynamodb table not found"})
    console.log("failed the table check")
  }
  checks["table"] = !! table

  // const people = []
  // const people = await getPeople(apolloClient);
  // if(people.length === 0) {
  //   console.log("failed the starwars check")
  // }
  // checks["starwars"] = (people.length > 0)

  return successResponse({message: "status", checks, table, people});
};

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

async function getPeople(apolloClient: ApolloClient): Promise<any[]> {
  const getPersonFuzzy = gql`
	query getPerson($person: String!) {
		getFuzzyPerson(person: $person, take: 10) {
			name
			birthYear
			eyeColors
			gender
		}
	}
`;
  const {
    data: { getPersonFuzzy: peopleData }
  } = await apolloClient.query<StarWarsGraphqlApiResponse<'getFuzzyPerson'>, QueryGetFuzzyPersonArgs>({
    query: getPersonFuzzy,
    variables: { person: 'luke' }
  });

  return peopleData;
}