/** @type {import('next').NextConfig} */
const nextConfig = {
	output: "standalone",
	reactStrictMode: true,
	distDir: ".next",
	images: {
		unoptimized: true,
	},
};

export default nextConfig;
