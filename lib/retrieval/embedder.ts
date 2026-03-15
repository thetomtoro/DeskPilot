import OpenAI from "openai";

let openai: OpenAI;
function getClient() {
  if (!openai) openai = new OpenAI();
  return openai;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await getClient().embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

export async function embedQuery(query: string): Promise<number[]> {
  const [embedding] = await embedTexts([query]);
  return embedding;
}
