import { Handler } from "aws-lambda";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand,QueryCommand, } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
  try {
    console.log("[EVENT]", JSON.stringify(event));
    const pathParameters  = event?.pathParameters;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : NaN;// 🔹 修改 1️: 确保 `movieId` 是 Number

    if (!movieId) {

      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }

    if (isNaN(movieId)) {
      return {
        statusCode: 400, // 🔹 修改 2️: 返回 400 代表 Bad Request
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Invalid movie Id" }),
      };
    }

    const commandOutput = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: movieId },
      })
    );
    console.log("GetCommand response: ", commandOutput);

    if (!commandOutput.Item) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Invalid movie Id" }),
      };
    }
   
    let body: { data: Record<string, any>; cast?: Record<string, any>[] } = {
      data: commandOutput.Item,
    };

 if (event.queryStringParameters?.cast === "true") {
      console.log("Fetching cast details for movieId:", movieId);

      // 🔹 修改 4️: 确保 `CAST_TABLE_NAME` 变量存在
      if (!process.env.CAST_TABLE_NAME) {
        return {
          statusCode: 500,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ Message: "Server error: CAST_TABLE_NAME is not set" }),
        };
      }

      const castOutput = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.CAST_TABLE_NAME, // 🔹 新增：查询演员信息
          KeyConditionExpression: "movieId = :m",
          ExpressionAttributeValues: {
            ":m": movieId,
          },
        })
      );

      console.log("Cast Query response: ", castOutput);

      body.cast = castOutput.Items && castOutput.Items.length > 0 ? castOutput.Items : [];

     
    }

    // Return Response
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
