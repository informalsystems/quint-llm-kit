import { HybridSearch } from '../search/hybrid-search.js';
import type { HybridSearchOptions, SearchResult, SearchScope } from '../search/types.js';

const VALID_SCOPES: SearchScope[] = ['all', 'builtins', 'docs', 'examples', 'guidelines', 'extra'];
const DEFAULT_LIMIT_PER_SCOPE = 5;

const hybridSearch = new HybridSearch();

function normalizeScopeValue(scope: string): SearchScope {
  const trimmed = scope?.trim();
  if (!trimmed) {
    return 'all';
  }

  if (VALID_SCOPES.includes(trimmed as SearchScope)) {
    return trimmed as SearchScope;
  }

  throw new Error(
    `Invalid scope '${scope}'. Valid scopes: ${VALID_SCOPES.map((s) => `'${s}'`).join(', ')}`
  );
}

function normalizeScopes(scope?: string, scopes?: string[]): SearchScope[] {
  if (scopes && scopes.length > 0) {
    const normalized = Array.from(new Set(scopes.map(normalizeScopeValue)));
    // If 'all' is requested alongside other scopes, prefer 'all' only to avoid duplication
    if (normalized.includes('all')) {
      return ['all'];
    }
    return normalized;
  }

  if (scope) {
    return [normalizeScopeValue(scope)];
  }

  return ['all'];
}

export interface HybridSearchResponse {
  query: string;
  scopes: SearchScope[];
  limitPerScope: number;
  resultsByScope: Record<SearchScope, SearchResult[]>;
  // Backwards compatibility fields when only one scope is requested
  scope?: SearchScope;
  k?: number;
  results?: SearchResult[];
}

export interface HybridSearchRequestOptions extends Omit<HybridSearchOptions, 'scope'> {
  scope?: string;
  scopes?: string[];
  limitPerScope?: number;
}

export async function runHybridSearch(
  query: string,
  options: HybridSearchRequestOptions = {}
): Promise<HybridSearchResponse> {
  const { scope: scopeOption, scopes: scopesOption, limitPerScope, ...rest } = options;
  const searchOptions = rest as HybridSearchOptions;
  const scopes = normalizeScopes(scopeOption, scopesOption);

  if (scopes.length === 1) {
    const scope = scopes[0];
    const k = rest.k ?? limitPerScope ?? 10;
    const results = await hybridSearch.search(query, { ...searchOptions, scope, k });

    return {
      query,
      scopes,
      scope,
      k,
      results,
      limitPerScope: k,
      resultsByScope: { [scope]: results }
    };
  }

  const perScopeLimit = limitPerScope ?? rest.k ?? DEFAULT_LIMIT_PER_SCOPE;
  const resultsByScope: Record<SearchScope, SearchResult[]> = {} as Record<SearchScope, SearchResult[]>;

  for (const scope of scopes) {
    const results = await hybridSearch.search(query, {
      ...searchOptions,
      scope,
      k: perScopeLimit
    });
    resultsByScope[scope] = results;
  }

  return {
    query,
    scopes,
    limitPerScope: perScopeLimit,
    resultsByScope
  };
}
