import { TableClient } from "@azure/data-tables";
import {
  app,
  HttpRequest,
  HttpResponse,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

const tableName = "ViewCount"; // Replace with the actual table name
const movieTableName = "Movies";
const connectionString = process.env.AzureWebJobsStorage || "";
const tableClient = TableClient.fromConnectionString(
  connectionString,
  tableName,
  {
    allowInsecureConnection: true,
  }
);
const movieTableClient = TableClient.fromConnectionString(
  connectionString,
  movieTableName,
  {
    allowInsecureConnection: true,
  }
);

async function GetMovie(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("Handing GetMovie request");
  const rowKey = req.query.get("id");
  const partitionKey = "Movies";

  if (!rowKey) {
    return {
      status: 400,
      body: "Please provide a movie id.",
      headers: {
        "Access-Control-Allow-Origin": "*", // Adjust this as needed
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    };
  }
  try {
    const retrivedEntity = await movieTableClient.getEntity(
      partitionKey,
      rowKey
    );
    return {
      status: 200,
      body: JSON.stringify(retrivedEntity),
      headers: {
        "Access-Control-Allow-Origin": "*", // Adjust this as needed
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    };
  } catch (error) {
    context.log(`Error retrieving entity: ${error.message}`);
    return {
      status: 404,
      body: "movie not found",
      headers: {
        "Access-Control-Allow-Origin": "*", // Adjust this as needed
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    };
  }
}

export async function queryTable(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const entities = tableClient.listEntities();
    let results: string[] = [];

    for await (const entity of entities) {
      results.push(
        `PartitionKey: ${entity.partitionKey}, RowKey: ${entity.rowKey}, count: ${entity.count}`
      );
    }

    return {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Allow all origins
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Allow specific methods
        "Access-Control-Allow-Headers": "Content-Type", // Allow specific headers
      },
      body: results.join("\n"),
    };
  } catch (error) {
    context.log("Error querying the table:", error);
    return {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*", // Allow all origins
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Allow specific methods
        "Access-Control-Allow-Headers": "Content-Type", // Allow specific headers
      },
      body: "An error occurred while querying the table.",
    };
  }
}

export async function updateTable(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const retrieveEntity = await tableClient.getEntity(
      "viewCount",
      "pageViews"
    );
    let viewCount =
      typeof retrieveEntity.count === "number" ? retrieveEntity.count : 0;
    viewCount += 1;

    const updateEntity = {
      partitionKey: "viewCount",
      rowKey: "pageViews",
      count: viewCount,
    };

    await tableClient.updateEntity(updateEntity, "Replace");
    return {
      status: 200,
      body: "View count updated successfully",
    };
  } catch (error) {
    context.log("Error updating the table: ", error);
    return {
      status: 500,
      body: "An error occurred while updating the view count.",
    };
  }
}

app.http("GetMovie", {
  methods: ["GET"],
  handler: GetMovie,
});

app.http("queryTable", {
  methods: ["GET"],
  handler: queryTable,
});

app.http("updateTable", {
  methods: ["POST"],
  handler: updateTable,
});
