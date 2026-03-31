import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AI DevOps Auto-Pilot | Deploy Any Repo Instantly",
  description:
    "AI-powered DevOps platform. Deploy GitHub repos to containers with AI error analysis and auto-fix suggestions.",
  keywords: ["devops", "deployment", "docker", "ai", "automation", "saas"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
