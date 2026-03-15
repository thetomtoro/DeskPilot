/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "chromadb",
      "@chroma-core/default-embed",
      "chromadb-default-embed",
      "@huggingface/transformers",
      "onnxruntime-node",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "onnxruntime-node": "commonjs onnxruntime-node",
        "@huggingface/transformers": "commonjs @huggingface/transformers",
      });
    }
    return config;
  },
};

export default nextConfig;
