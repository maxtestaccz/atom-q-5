import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProviderWrapper } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuizMaster - Take quizzes and test your knowledge",
  description: "An engaging quiz platform for students, educators, and competitive exam aspirants",
  keywords: ["quiz", "education", "learning", "test", "exam"],
  authors: [{ name: "QuizMaster Team" }],
  openGraph: {
    title: "QuizMaster",
    description: "Take quizzes and test your knowledge",
    url: "https://quizmaster.app",
    siteName: "QuizMaster",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuizMaster",
    description: "Take quizzes and test your knowledge",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProviderWrapper>
            {children}
            <Toaster />
          </SessionProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
