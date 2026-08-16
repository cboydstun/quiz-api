/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Google mark on the "Sign in with Google" button (login page).
        protocol: "https",
        hostname: "www.gstatic.com",
        pathname: "/firebasejs/**",
      },
    ],
  },
};

export default nextConfig;
