import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The FIT SDK is a plain Node package; load it at runtime instead of bundling it.
  serverExternalPackages: ['@garmin/fitsdk'],
};

export default nextConfig;
