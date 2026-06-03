import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ColorCustomizer } from "@/components/color-customizer";
import "./globals.css";

export const metadata: Metadata = {
  title: "CODE OS — Club Management Platform",
  description:
    "Babson CODE: Community of Developers and Entrepreneurs. A comprehensive club management platform for governance, project tracking, and collaboration.",
  keywords: ["CODE", "Babson", "club management", "developers", "entrepreneurs"],
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
            <ColorCustomizer />
          </AuthProvider>
        </ThemeProvider>

        {/* Spline 3D Viewer Script */}
        <script type="module" src="https://unpkg.com/@splinetool/viewer@1.12.67/build/spline-viewer.js" async></script>
      </body>
    </html>
  );
}
