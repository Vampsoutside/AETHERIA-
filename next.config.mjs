/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Rapier ships a WASM payload; three ships ESM addons. Let Next handle both.
  transpilePackages: ['three'],
  // Lint is intentionally not a build gate for this project (no eslint toolchain installed).
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // Raw GLSL imports are inlined as strings so shaders survive Turbopack + webpack alike.
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });
    config.externals = [...(config.externals ?? []), { canvas: 'commonjs canvas' }];
    return config;
  },
  experimental: {
    optimizePackageImports: ['@react-three/drei', '@radix-ui/react-dialog'],
  },
};

export default nextConfig;
