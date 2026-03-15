import { chunkDocument } from "./chunker";

describe("chunkDocument", () => {
  it("splits by headings", () => {
    const md = "# Title\n\nIntro paragraph.\n\n## Section A\n\nContent A.\n\n## Section B\n\nContent B.";
    const chunks = chunkDocument(md, "test.md");
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].metadata.source).toBe("test.md");
    expect(chunks.every(c => c.text.length > 0)).toBe(true);
  });

  it("preserves section titles in metadata", () => {
    const md = "# Main\n\n## Sub Section\n\nSome content here.";
    const chunks = chunkDocument(md, "test.md");
    const sub = chunks.find(c => c.metadata.section === "Sub Section");
    expect(sub).toBeDefined();
  });

  it("handles documents with no headings", () => {
    const md = "Just a plain paragraph of text without any headings.";
    const chunks = chunkDocument(md, "test.md");
    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toContain("plain paragraph");
  });
});
