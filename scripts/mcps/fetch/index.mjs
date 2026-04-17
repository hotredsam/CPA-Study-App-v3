#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "fetch-local", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "fetch",
      description: "Fetch a URL and return the response body as text.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to fetch" },
          method: { type: "string", default: "GET" },
          headers: { type: "object", default: {} },
          max_bytes: { type: "number", default: 200_000 },
        },
        required: ["url"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== "fetch") {
    throw new Error(`unknown tool: ${req.params.name}`);
  }
  const args = req.params.arguments ?? {};
  const url = String(args.url);
  const method = typeof args.method === "string" ? args.method : "GET";
  const headers = args.headers && typeof args.headers === "object" ? args.headers : {};
  const maxBytes = typeof args.max_bytes === "number" ? args.max_bytes : 200_000;

  const res = await fetch(url, { method, headers });
  const contentType = res.headers.get("content-type") ?? "";
  const buf = Buffer.from(await res.arrayBuffer());
  const truncated = buf.length > maxBytes;
  const body = buf.subarray(0, maxBytes).toString("utf8");

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: res.status,
            contentType,
            truncated,
            bytes: buf.length,
            body,
          },
          null,
          2
        ),
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
