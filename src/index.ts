#!/usr/bin/env node
/**
 * SaaS Pricing Intelligence MCP Server
 * 
 * Provides AI agents with tools to extract and compare SaaS pricing data.
 * Compatible with Claude Desktop, OpenClaw, and any MCP-enabled client.
 * 
 * @agent-capability pricing-extraction, saas-analysis, competitive-intelligence
 * @tool-discovery enabled
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ApifyClient } from "apify-client";
import { z } from "zod";

// Initialize Apify client
const apifyToken = process.env.APIFY_TOKEN;
if (!apifyToken) {
  console.error("APIFY_TOKEN environment variable is required");
  process.exit(1);
}

const apifyClient = new ApifyClient({ token: apifyToken });
const ACTOR_ID = "apricot_blackberry/saas-pricing-intelligence";

// Tool definitions
const tools: Tool[] = [
  {
    name: "extract_saas_pricing",
    description: `Extract pricing data from a SaaS product's pricing page. Returns structured JSON with:
- Pricing tiers (Free, Pro, Enterprise, etc.)
- Prices normalized to monthly USD
- Feature lists per tier
- Enterprise/contact-sales detection
- Popular/recommended tier identification

Use this when you need to gather pricing information for competitive analysis, market research, or answering questions about software costs.`,
    inputSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "List of SaaS pricing page URLs to extract (e.g., ['https://notion.so/pricing', 'https://github.com/pricing'])"
        },
        proxyTier: {
          type: "string",
          enum: ["datacenter", "residential"],
          default: "datacenter",
          description: "Proxy quality. Use 'residential' for better success on protected sites."
        },
        extractFeatures: {
          type: "boolean",
          default: true,
          description: "Whether to extract feature lists for each tier"
        }
      },
      required: ["urls"]
    }
  },
  {
    name: "compare_saas_pricing",
    description: `Compare pricing across multiple SaaS products and return a structured comparison.
    
Returns:
- Side-by-side tier comparison
- Price range analysis (min, max, average)
- Feature overlap detection
- Value assessment

Ideal for answering questions like "Which project management tool is cheapest for a team of 10?"`,
    inputSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "URLs of SaaS pricing pages to compare"
        },
        teamSize: {
          type: "number",
          description: "Optional team size for per-seat pricing calculations"
        }
      },
      required: ["urls"]
    }
  },
  {
    name: "discover_pricing_page",
    description: `Find the pricing page URL for a SaaS product given its homepage or any page on the site.
    
Useful when you have a product name but don't know the exact pricing URL.`,
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Homepage or any URL on the SaaS website"
        }
      },
      required: ["url"]
    }
  }
];

// Input validation schemas
const ExtractPricingInput = z.object({
  urls: z.array(z.string().url()),
  proxyTier: z.enum(["datacenter", "residential"]).default("datacenter"),
  extractFeatures: z.boolean().default(true)
});

const ComparePricingInput = z.object({
  urls: z.array(z.string().url()),
  teamSize: z.number().optional()
});

const DiscoverPricingInput = z.object({
  url: z.string().url()
});

// Create MCP server
const server = new Server(
  {
    name: "saas-pricing-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "extract_saas_pricing": {
        const input = ExtractPricingInput.parse(args);
        
        const run = await apifyClient.actor(ACTOR_ID).call({
          startUrls: input.urls.map(url => ({ url })),
          proxyTier: input.proxyTier,
          extractFeatures: input.extractFeatures,
          normalizePricing: true,
          maxRequestsPerCrawl: input.urls.length + 5
        });

        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(items, null, 2)
          }]
        };
      }

      case "compare_saas_pricing": {
        const input = ComparePricingInput.parse(args);
        
        const run = await apifyClient.actor(ACTOR_ID).call({
          startUrls: input.urls.map(url => ({ url })),
          proxyTier: "datacenter",
          extractFeatures: true,
          normalizePricing: true
        });

        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        
        // Build comparison
        const comparison = {
          products: items.map((item: any) => ({
            name: item.productName,
            url: item.url,
            tierCount: item.tiers?.length || 0,
            hasFreeTier: item.tiers?.some((t: any) => t.pricing?.type === "free"),
            lowestPaidPrice: item.tiers
              ?.filter((t: any) => t.normalizedMonthlyPrice > 0)
              ?.sort((a: any, b: any) => a.normalizedMonthlyPrice - b.normalizedMonthlyPrice)[0]
              ?.normalizedMonthlyPrice,
            tiers: item.tiers
          })),
          summary: {
            cheapest: null as any,
            mostExpensive: null as any,
            withFreeTier: [] as string[]
          }
        };

        // Calculate summary
        const paidProducts = comparison.products.filter(p => p.lowestPaidPrice);
        if (paidProducts.length > 0) {
          comparison.summary.cheapest = paidProducts.sort((a, b) => a.lowestPaidPrice - b.lowestPaidPrice)[0];
          comparison.summary.mostExpensive = paidProducts.sort((a, b) => b.lowestPaidPrice - a.lowestPaidPrice)[0];
        }
        comparison.summary.withFreeTier = comparison.products.filter(p => p.hasFreeTier).map(p => p.name);

        // Calculate team cost if teamSize provided
        if (input.teamSize) {
          comparison.products.forEach((p: any) => {
            p.estimatedTeamCost = p.tiers
              ?.filter((t: any) => t.pricing?.perUnit === "user")
              ?.map((t: any) => ({
                tier: t.name,
                monthly: t.normalizedMonthlyPrice * input.teamSize!,
                yearly: t.normalizedMonthlyPrice * input.teamSize! * 12
              }));
          });
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(comparison, null, 2)
          }]
        };
      }

      case "discover_pricing_page": {
        const input = DiscoverPricingInput.parse(args);
        
        const run = await apifyClient.actor(ACTOR_ID).call({
          startUrls: [{ url: input.url }],
          discoverPricingPage: true,
          maxRequestsPerCrawl: 5
        });

        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        const result = items[0];
        
        return {
          content: [{
            type: "text",
            text: result?.url 
              ? `Found pricing page: ${result.url}`
              : `Could not find pricing page for ${input.url}`
          }]
        };
      }

      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SaaS Pricing MCP server running on stdio");
}

main().catch(console.error);
