export interface Snippet {
  id: string;
  name: string;
  prefix: string;
  description?: string;
  body: string | string[];
  language: string;
  scope?: string;
  isBuiltIn?: boolean;
  category?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SnippetCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface SnippetImportExport {
  version: string;
  snippets: Snippet[];
  categories: SnippetCategory[];
  exportedAt: number;
}

export interface SnippetVariables {
  [key: string]: string;
}

export interface SnippetProviderOptions {
  language: string;
  prefix?: string;
  sortText?: string;
  filterText?: string;
  insertTextRules?: number;
}

export type SnippetSortBy = 'name' | 'prefix' | 'language' | 'createdAt' | 'updatedAt' | 'category';
export type SnippetSortOrder = 'asc' | 'desc';

export interface SnippetFilter {
  language?: string;
  category?: string;
  search?: string;
  isBuiltIn?: boolean;
}

export interface SnippetStats {
  total: number;
  byLanguage: Record<string, number>;
  byCategory: Record<string, number>;
  customCount: number;
  builtInCount: number;
} 