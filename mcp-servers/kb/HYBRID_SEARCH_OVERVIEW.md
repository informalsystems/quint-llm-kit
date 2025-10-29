# Quint KB MCP Server v2 Overview

This document explains the Model Context Protocol (MCP) tools exposed by
`quint-kb-mcp-v2`, the knowledge base that powers them, and how the new hybrid
search pipeline differs from the original v1 server.

---

## 1. MCP Tools

All tools are delivered over the MCP `tools/list` capability. They fall into
three families: reference lookups, knowledge-base browsers, and routing helpers.

### 1.1 Reference Lookups

| Tool | Description |
|------|-------------|
| `quint_get_builtin` | Fetches a Quint builtin (signature, description, examples, source URL). |
| `quint_list_builtins` | Lists builtins, optionally filtered by category (set/list/map/etc.). |
| `quint_get_doc` | Returns the full text of a documentation page (`docs/`, `choreo/`, `lessons/`). |
| `quint_list_docs` | Summarises the doc tree (core docs, choreo docs, lessons). |
| `quint_doc_outline` | Returns section headings (level + line number) for a doc so callers can fetch focused snippets. |
| `quint_get_example` | Returns the contents of an example `.qnt` file. |
| `quint_list_examples` | Lists examples or browses by category. |
| `quint_example_info` | Returns example metadata (category, modules, types, functions, actions, keywords, tests). |
| `quint_get_template` | Pulls a boilerplate template from `kb/templates`. |
| `quint_list_templates` | Lists templates with optional framework filter. |

### 1.2 Knowledge Patterns and Workflows

| Tool | Description |
|------|-------------|
| `quint_get_pattern` | Retrieves a structured pattern (state type, pure functions, etc.). |
| `quint_list_patterns` | Lists patterns, optionally by category. |
| `quint_search_patterns` | Keyword search across patterns. |

### 1.3 Routing and Guidance

| Tool | Description |
|------|-------------|
| `quint_suggest_framework` | Keyword heuristics that recommend “standard” vs “choreo” Quint. |
| `quint_list_examples` | (Also acts as a browser for feature discovery.) |

### 1.4 Hybrid Search

| Tool | Description |
|------|-------------|
| `quint_hybrid_search` | Combines lexical scoring with semantic embeddings and RRF fusion. Supports multi-scope queries. |

`quint_hybrid_search` accepts `{ query: string, scopes?: string[], limitPerScope?: number, scope?: string, k?: number }`.  
When `scopes` is provided, the response includes `resultsByScope` (per-scope lists); if omitted, the legacy single-scope `results` array remains available for backward compatibility.

---

## 2. Knowledge Base and Indices

All content lives under `kb/` and remains a curated snapshot of Quint
documentation, examples, and guidelines. The `npm run setup` script builds both
the legacy JSON indices and the v2 search assets:

```
data/
  builtins.json              # v1 builtin catalogue
  docs-index.json            # v1 document structure + inverted index
  docs-extra-index.json      # v1 choreo + blog index
  guidelines-index.json      # v1 pattern + workflow index
  examples-index.json        # v1 example metadata
  embeddings/                # v2 embedding payloads per scope
  vector-indices/            # v2 hnswlib indices per scope
  lexical-indices/           # v2 MiniSearch BM25 indices per scope
```

The v2 setup executes the following steps:

1. Validate `kb/` directory layout.
2. Build all v1 JSON indices (existing CLI remains functional).
3. Download or reuse the embedding model (`Xenova/all-MiniLM-L6-v2`, stored under `data/models/`).
4. Generate embeddings for each scope (builtins/docs/examples/guidelines/extra + aggregate `all`).
5. Train hnswlib vector indices (`cosine` metric, `M=16`, `efConstruction=200`).
6. Serialize MiniSearch lexical indices (prefix + fuzzy 0.2).
7. Verify the presence of all artefacts.

---

## 3. Search Architecture

### 3.1 Embedding Generator

* `src/search/embedding-generator.ts` uses `@xenova/transformers` pipeline API.
* Text is cleaned, truncated to 512 tokens, embedded with mean pooling, and normalised.
* Results are cached to speed up consecutive requests during interactive sessions.

### 3.2 Vector Store

* `src/search/vector-store.ts` wraps `hnswlib-node`’s `HierarchicalNSW`.
* One index per scope is loaded lazily from `data/vector-indices/<scope>.hnsw`.
* Query embeddings are generated on the fly and scored against the ANN index (`searchKnn`).

### 3.3 Lexical Search

* `src/search/lexical-search.ts` wraps MiniSearch (BM25-like ranking).
* Indices are pre-built and stored in JSON (lucene-style posting lists).
* Fuzzy matching (`fuzzy: 0.2`) improves tolerance to typos like “temporl”.

### 3.4 Hybrid Fusion Pipeline

1. Run lexical search (top 20 candidates).
2. Generate embedding and run vector search (top 20 candidates).
3. Apply Reciprocal Rank Fusion (RRF with `k=60`).
4. Optional reranker hook (`src/search/reranker.ts`) can re-order final hits. Default is a no-op.

The entire flow is orchestrated by `src/search/hybrid-search.ts`.

### 3.5 Legacy Search Retention

* `quint_search_docs` remains available for backwards compatibility.
* Keeping the substring search provides a fallback, eases regression checks, and retains fast literal lookups.

---

## 4. Setup & Usage

```
npm install
npm run setup   # builds indices, embeddings, and vector stores
npm run build   # compile TypeScript if you want to ship a bundled server
npm run dev     # run via tsx during development
npm start       # run compiled output from dist/
```

When configuring an MCP client (Claude, etc.), point to `dist/server.js` or use
`npm start` with the `quint-kb-mcp-v2` working directory.

---

## 5. Evaluation Summary

`scripts/evaluate-search.ts` compares the v2 hybrid search against the v1
substring baseline on representative queries. After running `npm run setup`,
invoke:

```
node --import tsx/esm scripts/evaluate-search.ts
```

Key observations from the current evaluation:

* Hybrid search handles typos and concept queries (“Byzantine consensus”,
  “temporl”, “voting protocols”) where the substring search returns nothing.
* Exact token lookups (“mapby”) still work in both; hybrid provides richer
  surrounding context (patterns/guidelines).
* Natural language questions (“How do I create a map from a set?”) still need
  intent normalisation to surface `mapBy` reliably — future improvements can
  include query rewriting or reranking strategies.

---

## 6. Repository Layout Highlights

```
src/
  indexers/          # builders for embeddings, lexical stores, misc JSON indices
  search/            # runtime hybrid search stack
  tools/             # MCP tool handlers (references, patterns, templates, search)
scripts/
  setup.ts           # full indexing pipeline
  evaluate-search.ts # comparison utility between v1 and v2 search engines
```

---

