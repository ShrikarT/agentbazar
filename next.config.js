/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? "" : "http://localhost:8000"),
    NEXT_PUBLIC_EXPLORER: "https://preprod.cardanoscan.io/transaction",
  },
}
