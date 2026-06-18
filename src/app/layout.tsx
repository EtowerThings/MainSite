import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "eTower — Babson's Premier Entrepreneurial Community",
  description:
    "Where Boston's next generation of entrepreneurs live, learn, and launch. Join eTower at Babson College.",
  keywords: ["eTower", "Babson", "entrepreneurship", "startups", "living learning community"],
  icons: {
    icon: "/CODELogo.png",
    apple: "/CODELogo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
