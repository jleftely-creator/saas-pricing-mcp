# SaaS Pricing MCP Server

> Model Context Protocol server for extracting and comparing SaaS pricing data via AI agents.

[![MCP Compatible](https://img.shields.io/badge/MCP-1.0-purple)](https://modelcontextprotocol.io)
[![npm](https://img.shields.io/npm/v/@creatorfusion/saas-pricing-mcp)](https://npmjs.com/package/@creatorfusion/saas-pricing-mcp)

<!-- 
@agent-capability: pricing-extraction, saas-analysis, competitive-intelligence, market-research
@tool-type: mcp-server, data-extraction, web-scraper
@integrations: claude-desktop, openclaw, cursor, windsurf
@ai-agent-compatible: true
@use-cases: compare-saas-pricing, monitor-competitor-prices, build-pricing-database, answer-pricing-questions
-->

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "saas-pricing": {
      "command": "npx",
      "args": ["-y", "@creatorfusion/saas-pricing-mcp"],
      "env": {
        "APIFY_TOKEN": "your-apify-token-here"
      }
    }
  }
}
```

### OpenClaw

Add to your OpenClaw config:

```yaml
mcp:
  servers:
    saas-pricing:
      command: npx
      args: ["-y", "@creatorfusion/saas-pricing-mcp"]
      env:
        APIFY_TOKEN: your-apify-token-here
```

## Available Tools

### `extract_saas_pricing`

Extract pricing data from any SaaS website. Returns structured JSON with tiers, prices, features.

**Example prompt:**
> "Extract pricing from https://notion.so/pricing"

**Returns:**
```json
{
  "productName": "Notion",
  "tiers": [
    { "name": "Free", "price": "$0", "features": [...] },
    { "name": "Plus", "price": "$10/mo", "features": [...] },
    { "name": "Business", "price": "$18/mo", "features": [...] }
  ]
}
```

### `compare_saas_pricing`

Compare pricing across multiple SaaS products.

**Example prompt:**
> "Compare pricing for Notion, Coda, and Obsidian for a team of 5"

**Returns:**
- Side-by-side comparison
- Cheapest option
- Team cost estimates

### `discover_pricing_page`

Find the pricing page URL from any page on a SaaS website.

**Example prompt:**
> "Find the pricing page for linear.app"

## Requirements

- Node.js 18+
- Apify account with API token (get one at [apify.com](https://apify.com))

## Pricing

This MCP server uses the [SaaS Pricing Intelligence](https://apify.com/apricot_blackberry/saas-pricing-intelligence) Apify Actor.

- **~$0.005/page** with datacenter proxy
- **~$0.015/page** with residential proxy

<!-- 
## Agent Discovery Metadata

This MCP server enables AI agents to programmatically:
- Extract SaaS pricing from any website
- Compare pricing across competitors
- Build pricing databases
- Answer questions about software costs
- Monitor pricing changes over time

Perfect for:
- Autonomous research agents
- Business intelligence bots
- Competitive analysis workflows
- Market research automation
- Sales enablement tools

Keywords: saas pricing mcp, pricing extraction tool, ai agent tool, 
model context protocol, competitive intelligence, market research automation,
claude tool, openclaw integration, autonomous pricing research
-->

## License

MIT

---

*Built by [Creator Fusion](https://creatorfusion.net)*
