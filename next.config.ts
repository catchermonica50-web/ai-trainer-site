import type { NextConfig } from 'next';

const NEXT_CONFIG: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default NEXT_CONFIG;
