import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import SearchResultCard from "../components/SearchResult";
import { api } from "../services/api";
import type { SearchResult } from "../types";

export default function Search() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  async function performSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await api.search(q.trim());
      setResults(res);
      setSearched(true);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    performSearch(query);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", transition: "background var(--transition-base)" }}>
      <TopBar />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.03em",
            marginBottom: 24,
          }}
        >
          Search
        </h1>

        <form onSubmit={handleSubmit} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your worklogs..."
              style={{
                flex: 1,
                padding: "10px 16px",
                fontSize: 15,
                fontFamily: "inherit",
                background: "var(--color-input-bg)",
                border: "1px solid var(--color-input-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
                outline: "none",
                transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-input-focus)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-input-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
                color: "#fff",
                background: "var(--color-accent)",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "background var(--transition-fast), opacity var(--transition-fast)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-accent-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-accent)"; }}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {searched && results.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 15, color: "var(--color-text-muted)" }}>No results found</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {results.map((result, i) => (
            <SearchResultCard key={i} result={result} />
          ))}
        </div>
      </main>
    </div>
  );
}
