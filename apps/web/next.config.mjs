const nextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@conciliacion/contracts"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
