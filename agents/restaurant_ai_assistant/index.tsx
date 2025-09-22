import { Agent, Prompt, Route, Routes, State, StateField, Trigger, Workflow } from "@autonia/actors";
import { ChatOpenAI } from "@autonia/providers";
import { InputChat } from "@autonia/triggers";
import { AgentState } from "@autonia/types";
import dotenv from "dotenv";
import { z } from "zod";
import { AVAILABLE_TABLES, STRUCTURED_TABLE_SCHEMAS } from "./const";
import { Tool } from "@autonia/tools";
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

const RestaurantAIAssistant = async () => {
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
        <StateField description="Tables" name="tables" type="array" />
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
        id="table_analyzer_agent"
        name="Table Analyzer Agent"
        role="Database Schema Analyst"
        goal="Analyze user queries to determine which database tables are needed for restaurant metrics"
        model={ChatOpenAI("gpt-4o", { maxTokens: 1000, apiKey: process.env.OPENAI_API_KEY })}
        expectedOutput={z.object({
          tables: z.array(z.string()),
        })}
        transformOutput={(_agentGraph: any, stateUpdates: AgentState) => {
          let output = stateUpdates.messages?.[stateUpdates.messages.length - 1]?.content?.find((content: any) => content.type === "json")?.text;
          output = JSON.parse(output);
          return {
            tables: output.tables,
          };
        }}
        useContextHistory={true}
        updateState={true}
      >
        <Prompt>
          {({ state }) => `
          You are a database schema analyst for a restaurant operations system. 
          
          User Query: "${state.current_user_query}"
          
          Your task is to analyze this query and determine which database tables are needed to answer it.
          Use the table-analysis tool to identify the relevant tables and provide analysis.
          
          The restaurant database contains tables for:
          ${AVAILABLE_TABLES.map((table) => `- ${table.name} (${table.description}) Relationships: ${table.relationships.join(", ")}`).join("\n")}
          
          Determine which tables needs to be used for fetch the required data from the database for answering the user query.
        `}
        </Prompt>
      </Agent>

      <Agent
        id="sql_generator_agent"
        name="SQL Generator Agent"
        role="SQL Query Generator"
        goal="Generate and execute SQL queries based on table analysis results"
        model={ChatOpenAI("gpt-4o", { maxTokens: 1000, apiKey: process.env.OPENAI_API_KEY })}
        tools={[executeSQLTool]}
        updateState={true}
        useContextHistory={true}
        react={true}
        transformOutput={(_agentGraph: any, stateUpdates: AgentState) => {
          console.log("sql_generator_agent", stateUpdates);
          return stateUpdates;
        }}
      >
        <Prompt>
          {({ state, input }) => {
            console.log("input :", input);
            console.log("state :", state);
            return `
          You are a SQL query generator for restaurant operations analytics.
          
          Original User Query: "${state.current_user_query}"
          
          Table Schema: ${state?.tables?.map((table: string) => `${table}: ${JSON.stringify(STRUCTURED_TABLE_SCHEMAS[table], null, 2)}`).join("\n")}

          Important: Use only the columns that are present in the table schema.
          
          Based on the table schema and user query call the tool to get results for the user query.
          
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
        useContextHistory={true}
        model={ChatOpenAI("gpt-4o", { maxTokens: 1000, apiKey: process.env.OPENAI_API_KEY })}
      >
        <Prompt>
          {({ state }) => `
          You are a data presentation specialist for restaurant operations.
          
          Original User Query: "${state.current_user_query}"
          
          Your task is to present these results in a clear, user-friendly format with insights and recommendations.
          
          Please provide:
          1. A clear summary of what the data shows
          2. Key insights from the results
          3. Any trends or patterns you notice
          4. Actionable recommendations based on the data
          5. The results in a user-friendly format with insights and recommendations.
          6. Choose one or more appropriate type of UI elements (table, chart, card, text) to present the data
             - use text for recommendations, insights, trends, patterns, etc.
             - use table for data that is tabular in nature.
             - use chart for data that needs to be compared or displayed in a visual way.
             - use card for data that is not tabular in nature.
          
          Make your response conversational and helpful, as if you're a restaurant consultant explaining the data to the restaurant owner.

          Do not make up any data or make any assumptions.
        `}
        </Prompt>
      </Agent>

      <Routes>
        <Route from="metrics_input" to="table_analyzer_agent" />
        <Route from="table_analyzer_agent" to="sql_generator_agent" />
        <Route from="sql_generator_agent" to="results_presenter_agent" />
      </Routes>
    </Workflow>
  );
};

export default RestaurantAIAssistant;
