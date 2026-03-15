export interface Chunk {
  id: string;
  text: string;
  metadata: {
    source: string;
    section: string;
    chunkIndex: number;
  };
}

export function chunkDocument(markdown: string, filename: string): Chunk[] {
  const sections = splitByHeadings(markdown);
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const paragraphs = splitIntoParagraphs(section.content);
    let buffer = "";

    for (const para of paragraphs) {
      if (estimateTokens(buffer + "\n\n" + para) > 400 && buffer.length > 0) {
        chunks.push({
          id: `${filename}-${chunkIndex}`,
          text: buffer.trim(),
          metadata: { source: filename, section: section.title, chunkIndex },
        });
        chunkIndex++;
        // Overlap: keep last ~50 tokens
        const words = buffer.split(/\s+/);
        buffer = words.slice(-37).join(" ") + "\n\n" + para;
      } else {
        buffer = buffer ? buffer + "\n\n" + para : para;
      }
    }

    if (buffer.trim()) {
      chunks.push({
        id: `${filename}-${chunkIndex}`,
        text: buffer.trim(),
        metadata: { source: filename, section: section.title, chunkIndex },
      });
      chunkIndex++;
    }
  }

  return chunks;
}

interface Section {
  title: string;
  content: string;
}

function splitByHeadings(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let currentTitle = "Introduction";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      if (currentContent.length > 0) {
        sections.push({ title: currentTitle, content: currentContent.join("\n") });
      }
      currentTitle = headingMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0 || sections.length === 0) {
    sections.push({ title: currentTitle, content: currentContent.join("\n") });
  }

  return sections.filter(s => s.content.trim().length > 0);
}

function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter(p => p.trim().length > 0);
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.33);
}
