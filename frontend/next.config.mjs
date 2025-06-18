import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  transpilePackages: ['framer-motion'],
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@'] = path.resolve(process.cwd(), 'src');
    return config;
  },
};

export default nextConfig;
