import { Agent, Prompt, Route, Routes, State, StateField, Trigger, Workflow } from "@autonia/actors";
import { ChatOpenAI } from "@autonia/providers";
import { Tool } from "@autonia/tools";
import { InputChat } from "@autonia/triggers";
import { AgentState } from "@autonia/types";
import dotenv from "dotenv";
import { z } from "zod";
import { executeQuery } from "./utils/database";

dotenv.config();

// SQL execution tool
const executeSQLTool = new Tool({
  name: "execute-sql",
  description: "Execute SQL queries against the restaurant database",
  schema: z.object({
    query: z.string().describe("The SQL query to execute"),
    description: z.string().describe("Description of what the query is trying to find"),
  }),
  func: async ({ query, description }: { query: string; description: string }) => {
    try {
      console.log(`Executing SQL query: ${description}`);
      console.log(`Query: ${query}`);

      const results = await executeQuery(query);

      return {
        success: true,
        data: results,
        rowCount: results.length,
        description: description,
      };
    } catch (error) {
      console.error("SQL execution error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        description: description,
      };
    }
  },
});

// Database schema fetching tool
const fetchSchemaTool = async () => {
  try {
    console.log("Fetching database schema information...");
    // Get list of tables using SQL query
    const tablesResult = await executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const tables = tablesResult.map((row: any) => row.table_name);

    // Query to get table information
    const tableQuery = `
        SELECT 
          t.table_name,
          t.table_type,
          obj_description(c.oid) as table_comment
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        WHERE t.table_schema = 'public'
        ${tables && tables.length > 0 ? `AND t.table_name = ANY($1)` : ""}
        ORDER BY t.table_name;
      `;

    // Query to get column information
    const columnQuery = `
        SELECT 
          c.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          col_description(pgc.oid, c.ordinal_position) as column_comment
        FROM information_schema.columns c
        LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
        WHERE c.table_schema = 'public'
        ${tables && tables.length > 0 ? `AND c.table_name = ANY($1)` : ""}
        ORDER BY c.table_name, c.ordinal_position;
      `;

    // Query to get foreign key relationships
    const relationQuery = `
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        ${tables && tables.length > 0 ? `AND tc.table_name = ANY($1)` : ""}
        ORDER BY tc.table_name, kcu.column_name;
      `;

    const params = tables && tables.length > 0 ? [tables] : [];

    const [tableResults, columnResults, relationResults] = await Promise.all([
      executeQuery(tableQuery, params),
      executeQuery(columnQuery, params),
      executeQuery(relationQuery, params),
    ]);

    // Organize the data with table names as keys
    const tablesObject: Record<string, any> = {};

    tableResults.forEach((table: any) => {
      tablesObject[table.table_name] = {
        name: table.table_name,
        type: table.table_type,
        comment: table.table_comment,
        columns: columnResults
          .filter((col: any) => col.table_name === table.table_name)
          .map((col: any) => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable === "YES",
            default: col.column_default,
            maxLength: col.character_maximum_length,
            precision: col.numeric_precision,
            scale: col.numeric_scale,
            comment: col.column_comment,
          })),
        relationships: relationResults
          .filter((rel: any) => rel.table_name === table.table_name)
          .map((rel: any) => ({
            column: rel.column_name,
            referencesTable: rel.foreign_table_name,
            referencesColumn: rel.foreign_column_name,
            constraintName: rel.constraint_name,
          })),
      };
    });

    return tablesObject;
  } catch (error) {
    console.error("Schema fetch error:", error);
    return {
      schema_info: null,
      error: error instanceof Error ? error.message : "Unknown error occurred while fetching schema",
    };
  }
};

const RestaurantAIAssistant = async () => {
  const schemaInfo = await fetchSchemaTool();

  return (
    <Workflow
      id="restaurant_ai_assistant"
      name="Restaurant AI Assistant"
      description="AI Assistant for Restaurant Operations"
      goal="Analyze user queries and provide answers to user's questions using PostgreSQL data"
    >
      <State>
        <StateField description="Current User Query" name="current_user_query" type="string" />
        <StateField description="SQL Query Results" name="sql_results" type="object" />
        <StateField description="Selected Tables" name="selected_tables" type="array" />
        <StateField description="Next Agent" name="next_agent" type="string" />
        <StateField description="Schema Information" name="schema_info" type="object" default={schemaInfo} />
      </State>

      <Trigger
        id="metrics_input"
        trigger={InputChat({ title: "Restaurant Query", type: "chat" })}
        updateState={true}
        transformOutput={(_agentGraph: any, stateUpdates: AgentState) => {
          try {
            let message = stateUpdates.messages?.[stateUpdates.messages.length - 1];
            let user_query = message?.content?.find((content: any) => content.type === "text")?.text;
            return { current_user_query: user_query };
          } catch (error) {
            console.error("Error fetching user query:", error);
            return { current_user_query: "" };
          }
        }}
      />
      <Agent
        id="intent_router_agent"
        name="Intent Router Agent"
        role="Query Intent Analyzer"
        goal="Analyze user intent to determine if they want new data or more analysis of existing data"
        model={ChatOpenAI("gpt-4.1", { maxTokens: 1000, apiKey: process.env.OPENAI_API_KEY })}
        expectedOutput={z.object({
          next_agent: z.enum(["table_analyzer_agent", "results_presenter_agent"]),
          reasoning: z.string(),
          updated_query: z.string(),
        })}
        transformOutput={(_agentGraph: any, stateUpdates: AgentState) => {
          let output = stateUpdates.messages?.[stateUpdates.messages.length - 1]?.content?.find((content: any) => content.type === "json")?.text;
          output = JSON.parse(output);

          const updateObject: any = {
            next_agent: output.next_agent,
          };

          // Update the current_user_query if an updated query is provided
          if (output.updated_query) {
            updateObject.current_user_query = output.updated_query;
          }

          return updateObject;
        }}
        useContextHistory={(state) => ({ messages: (state.messages || []).slice(-15) })}
        updateState={true}
      >
        <Prompt>
          {({ state }) => {
            return `
          You are an intent analyzer for restaurant operations queries.
          
          Current User Query: "${state.current_user_query}"
          
          Your task is to:
          1. Analyze the user's intent and determine which agent should handle it next
          2. If needed, refine or expand the user query based on conversation context to make it more specific and actionable
          
          Agent Routing Rules:
          1. If the user is asking for NEW data, metrics, or information that requires a database query, route to "table_analyzer_agent"
          2. If the user is asking for MORE ANALYSIS, insights, explanations, or different presentations of EXISTING data, route to "results_presenter_agent"
          
          Examples of queries that should go to "table_analyzer_agent":
          - "Show me sales for last month"
          - "What are the top selling items?"
          - "How many customers visited today?"
          - "give me an item wise split up" (needs database query for item-wise sales data)
          
          Examples of queries that should go to "results_presenter_agent":
          - "Can you explain this data better?"
          - "Show me this in a chart format"
          - "What insights can you provide from these results?"
          - "Can you break this down differently?"
          - "Give me marketing strategies to improve sales?"
          
          Query Enhancement Guidelines:
          - If the query is vague (like "item wise split up"), enhance it with context (e.g., "Show me item-wise sales breakdown for this week")
          - Add time context if missing (default to current week/month if not specified)
          - Make the query more specific and actionable for database analysis
          
          Analyze the user's query, determine which agent should handle it next, and optionally provide an enhanced version of the query.
        `;
          }}
        </Prompt>
      </Agent>

      <Agent
        id="table_analyzer_agent"
        name="Table Analyzer Agent"
        role="Database Schema Analyst"
        goal="Analyze user queries to determine which database tables are needed for restaurant metrics"
        model={ChatOpenAI("gpt-4.1", { maxTokens: 1000, apiKey: process.env.OPENAI_API_KEY })}
        expectedOutput={z.object({
          tables: z.array(z.string()),
        })}
        transformOutput={(_agentGraph: any, stateUpdates: AgentState) => {
          let output = stateUpdates.messages?.[stateUpdates.messages.length - 1]?.content?.find((content: any) => content.type === "json")?.text;
          output = JSON.parse(output);
          return {
            selected_tables: output.tables,
          };
        }}
        updateState={true}
      >
        <Prompt>
          {({ state }) => {
            const availableTables = schemaInfo
              ? Object.values(schemaInfo)
                  .map(
                    (table: any) => `- ${table.name} (${table.comment || "Restaurant data table"}) 
                Relationships: ${table.relationships.map((rel: any) => `${rel.column} -> ${rel.referencesTable}.${rel.referencesColumn}`).join(", ")}`
                  )
                  .join("\n")
              : "No tables found";

            console.log("availableTables :", availableTables);

            return `
          You are a database schema analyst for a restaurant operations system. 
          
          User Query: "${state.current_user_query}"
          
          Your task is to analyze this query and determine which database tables are needed to answer it.
          
          Available Database Tables:
          ${availableTables}
          
          Analyze the user query and determine which tables are needed to fetch the required data from the database.
          Return the table names in the expected JSON format.
        `;
          }}
        </Prompt>
      </Agent>

      <Agent
        id="sql_generator_agent"
        name="SQL Generator Agent"
        role="SQL Query Generator"
        goal="Generate and execute SQL queries based on table analysis results"
        model={ChatOpenAI("gpt-4.1", { maxTokens: 1000, apiKey: process.env.OPENAI_API_KEY })}
        tools={[executeSQLTool]}
        updateState={true}
        useContextHistory={(state) => ({ messages: (state.messages || []).slice(-10) })}
        react={true}
        transformOutput={(_agentGraph: any, stateUpdates: AgentState) => {
          return stateUpdates;
        }}
      >
        <Prompt>
          {({ state }) => {
            // Get schema info for the selected tables
            const selectedTablesSchema =
              state?.selected_tables
                ?.map((tableName: string) => {
                  const tableSchema = schemaInfo?.[tableName];
                  return `${JSON.stringify(tableSchema, null, 2)}`;
                })
                .join("\n") || "No tables selected";

            return `
          You are a SQL query generator for restaurant operations analytics.
          
          Original User Query: "${state.current_user_query}"
          
          Selected Tables Schema:
          ${selectedTablesSchema}

          Important: Use only the columns that are present in the table schema above.
          
          Based on the table schema and user query, call the execute-sql tool to get results for the user query.
          Make sure your SQL query is syntactically correct and uses only existing columns.
          
        `;
          }}
        </Prompt>
      </Agent>
      <Agent
        id="results_presenter_agent"
        name="Results Presenter Agent"
        role="Data Presentation Specialist"
        goal="Present SQL query results in a user-friendly format with insights"
        updateState={true}
        expectedOutput={z.object({
          sections: z.array(
            z.object({
              type: z.enum(["text", "table", "chart", "cards", "card"]),
              data: z.union([
                // TableData
                z
                  .object({
                    headers: z.array(z.string()),
                    rows: z.array(z.array(z.union([z.string(), z.number()]))),
                  })
                  .describe("Table data"),

                // ChartData
                z
                  .object({
                    type: z.enum(["bar", "line", "pie", "doughnut", "mixed"]),
                    labels: z.array(z.string()),
                    datasets: z.array(
                      z.object({
                        data: z.array(z.number()),
                        label: z.string(),
                        backgroundColor: z.union([z.string(), z.array(z.string())]),
                        borderColor: z.string(),
                        borderWidth: z.number(),
                        borderDash: z.array(z.number()),
                        fill: z.boolean(),
                        tension: z.number(),
                        type: z.string(),
                        yAxisID: z.string(),
                        pointRadius: z.number(),
                      })
                    ),
                  })
                  .describe("Chart Data"),
                // CardData[]
                z
                  .array(
                    z.object({
                      title: z.string(),
                      value: z.union([z.string(), z.number()]),
                      change: z.string(),
                      trend: z.enum(["up", "down", "neutral"]),
                      icon: z.string(),
                      description: z.string(),
                    })
                  )
                  .describe("Card Data"),
                z
                  .object({
                    text: z.string(),
                  })
                  .describe("Text data"),
              ]),
            })
          ),
        })}
        useContextHistory={(state) => ({ messages: (state.messages || []).slice(-10) })}
        model={ChatOpenAI("gpt-4.1", { maxTokens: 8000, apiKey: process.env.OPENAI_API_KEY })}
      >
        <Prompt>
          {({ state }) => `
          You are a data presentation specialist for restaurant operations.
          
          Original User Query: "${state.current_user_query}"
          
          Based on the SQL query results, your task is to present these results in a clear, user-friendly format with insights and recommendations.
          
          Please provide:
          1. A clear summary of what the data shows.
          2. Key insights from the results.
          3. Any trends or patterns you notice.
          4. Actionable recommendations based on the data.
          5. The results in a user-friendly format with insights and recommendations.
          6. Choose one or more appropriate type of UI elements (table, chart, card, text) to present the data
             - use text for recommendations, insights, trends, patterns, etc.
             - use table for data that is tabular in nature.
             - use chart for data that needs to be compared or displayed in a visual way.
             - use card for data that is not tabular in nature.
          7. Use chart based visualizations wherever possible.
          8. Here is the preference priority of UI elements:
            - chart
            - table
            - card
            - text
          
          Make your response conversational and helpful, as if you're a restaurant consultant explaining the data to the restaurant owner.

          Do not make up any data or make any assumptions.
        `}
        </Prompt>
      </Agent>

      <Routes>
        <Route from="metrics_input" to="intent_router_agent" />
        <Route from="intent_router_agent" condition={(state) => state.next_agent} />
        <Route from="table_analyzer_agent" to="sql_generator_agent" />
        <Route from="sql_generator_agent" to="results_presenter_agent" />
      </Routes>
    </Workflow>
  );
};

export default RestaurantAIAssistant;
