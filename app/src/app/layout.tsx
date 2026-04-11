import type { Metadata, Viewport } from "next";
import { Geist, Noto_Serif_KR, Gowun_Dodum } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const notoSerifKR = Noto_Serif_KR({
  variable: "--font-serif",
  weight: ["400", "600"],
  preload: false,
});

const gowunDodum = Gowun_Dodum({
  variable: "--font-hand",
  weight: "400",
  preload: false,
});

export const metadata: Metadata = {
  title: "QuietTime",
  description: "매일의 큐티 습관을 돕는 노트 앱",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "QuietTime",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
};

const fontScript = `
(function() {
  try {
    var f = localStorage.getItem('quiettime-font') || 'sans';
    document.documentElement.setAttribute('data-font', f);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#7c8cf0",
          colorBackground: "#1a1a2e",
          colorInputBackground: "#253352",
          colorInputText: "#e0e0e0",
          colorText: "#e0e0e0",
          colorTextSecondary: "#a0a0b0",
        },
      }}
    >
      <html
        lang="ko"
        className={`${geistSans.variable} ${notoSerifKR.variable} ${gowunDodum.variable} h-full antialiased`}
        data-font="sans"
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: fontScript }} />
        </head>
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
