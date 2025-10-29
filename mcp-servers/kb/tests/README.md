# Tests

Manual test scripts for the Quint KB MCP server.

## Running Tests

### Test Search Functionality
```bash
npm run test:search
```
Tests the enhanced search functionality with keyword search, topic search, and operator search.

### Test MCP Server
```bash
npm run test:server
```
Starts the MCP server and runs a series of test requests to verify all tools work.

### Test Specific Tool
```bash
npm run test:tool <tool-name> '<args-json>'
```

Examples:
```bash
npm run test:tool quint_list_patterns
npm run test:tool quint_get_pattern '{"patternId":"map-initialization"}'
npm run test:tool quint_search_docs '{"query":"mapBy","scope":"all"}'
npm run test:tool quint_suggest_framework '{"description":"ERC20 token"}'
```

## Requirements

- Run `npm run setup` first to generate indices
- Run `npm run build` to compile TypeScript to JavaScript
