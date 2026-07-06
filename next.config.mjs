/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // dev 時の左下バッジがライブテロップに被るため無効化（画面共有前提のアプリ）。
  devIndicators: false,
};

export default nextConfig;
