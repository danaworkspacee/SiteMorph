import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import { ThemeProvider } from "~/providers/theme-provider";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

const sourceSerif = Source_Serif_4({
	variable: "--font-source-serif",
	subsets: ["latin"],
	weight: ["400"],
});

export const metadata: Metadata = {
	title: "SiteMorph - Morph any website into clean HTML + Tailwind",
	description:
		"SiteMorph lets you morph any website into clean, readable HTML + Tailwind. Get the files instantly and deploy them anywhere.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="h-full" suppressHydrationWarning>
			<body
				className={`${inter.variable} ${sourceSerif.variable} antialiased flex flex-col h-full`}
			>
				<ThemeProvider>
					<Toaster />
					<Analytics />
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
