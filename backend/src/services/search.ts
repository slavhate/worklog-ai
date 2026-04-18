import { ChromaClient, Collection } from "chromadb";
import { SearchResult } from "../types/index.js";

export type EmbedFunction = (text: string) => Promise<number[]>;

export class SearchService {
  private client: ChromaClient;
  private embed: EmbedFunction;
  private collection: Collection | null = null;

  constructor(chromaUrl: string, embedFn: EmbedFunction) {
    this.client = new ChromaClient({ path: chromaUrl });
    this.embed = embedFn;
  }

  private async getCollection(): Promise<Collection> {
    if (!this.collection) {
      this.collection = await this.client.getOrCreateCollection({ name: "worklogs" });
    }
    return this.collection;
  }

  async indexEntry(text: string, type: string, date: string, tags: string[]): Promise<void> {
    const collection = await this.getCollection();
    const embedding = await this.embed(text);
    const id = `${date}-${type}-${Date.now()}`;
    await collection.add({
      ids: [id],
      documents: [text],
      embeddings: [embedding],
      metadatas: [{ type, date, tags: tags.join(" ") }],
    });
  }

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const collection = await this.getCollection();
    const queryEmbedding = await this.embed(query);
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
    });

    if (!results.documents[0] || results.documents[0].length === 0) {
      return [];
    }

    return results.documents[0].map((doc, i) => {
      const meta = results.metadatas[0][i] as { type: string; date: string; tags: string };
      const distance = results.distances ? results.distances[0][i] : 0;
      return {
        text: doc || "",
        type: meta.type as SearchResult["type"],
        date: meta.date,
        score: Math.max(0, 1 - distance),
        tags: meta.tags ? meta.tags.split(" ").filter(Boolean) : [],
      };
    });
  }
}
