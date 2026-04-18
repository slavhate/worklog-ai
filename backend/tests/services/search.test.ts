import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchService } from "../../src/services/search.js";

const mockCollection = {
  add: vi.fn(),
  query: vi.fn(),
};

const mockClient = {
  getOrCreateCollection: vi.fn().mockResolvedValue(mockCollection),
};

vi.mock("chromadb", () => ({
  ChromaClient: vi.fn().mockImplementation(() => mockClient),
}));

describe("SearchService", () => {
  let service: SearchService;
  const mockEmbedFn = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SearchService("http://localhost:8000", mockEmbedFn);
  });

  it("indexes an entry with embedding and metadata", async () => {
    await service.indexEntry("Test decision", "decision", "2026-04-18", ["#project"]);

    expect(mockEmbedFn).toHaveBeenCalledWith("Test decision");
    expect(mockCollection.add).toHaveBeenCalledWith({
      ids: [expect.stringContaining("2026-04-18-decision-")],
      documents: ["Test decision"],
      embeddings: [[0.1, 0.2, 0.3]],
      metadatas: [{ type: "decision", date: "2026-04-18", tags: "#project" }],
    });
  });

  it("queries and returns search results", async () => {
    mockCollection.query.mockResolvedValue({
      documents: [["Found decision"]],
      metadatas: [[{ type: "decision", date: "2026-04-18", tags: "#project" }]],
      distances: [[0.25]],
    });

    const results = await service.search("migration decisions", 5);

    expect(mockEmbedFn).toHaveBeenCalledWith("migration decisions");
    expect(results).toEqual([
      {
        text: "Found decision",
        type: "decision",
        date: "2026-04-18",
        score: 0.75,
        tags: ["#project"],
      },
    ]);
  });

  it("returns empty array when query returns no results", async () => {
    mockCollection.query.mockResolvedValue({
      documents: [[]],
      metadatas: [[]],
      distances: [[]],
    });

    const results = await service.search("nothing", 5);
    expect(results).toEqual([]);
  });
});
