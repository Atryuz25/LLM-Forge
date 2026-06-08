import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "LLMForge",
  description: "Production LLM Pipeline Framework",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark h-full antialiased"
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <AuthProvider>
          {children}
          <Toaster theme="dark" position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
