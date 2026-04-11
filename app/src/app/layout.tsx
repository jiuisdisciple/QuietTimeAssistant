import type { Metadata, Viewport } from "next";
import { Geist, Noto_Serif_KR, Gowun_Dodum } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
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
        baseTheme: dark,
        variables: {
          colorPrimary: "#7c8cf0",
          colorBackground: "#1a1a2e",
          colorInputBackground: "#253352",
          colorInputText: "#e8e8ec",
          colorText: "#e8e8ec",
          colorTextSecondary: "#b4b4c0",
          colorDanger: "#ef4444",
          colorSuccess: "#10b981",
          borderRadius: "0.5rem",
        },
        elements: {
          card: {
            background: "#1a1a2e",
            border: "1px solid #2a2a42",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          },
          headerTitle: { color: "#f5f5fa" },
          headerSubtitle: { color: "#b4b4c0" },
          socialButtonsBlockButton: {
            background: "#253352",
            border: "1px solid #3a4a70",
            color: "#e8e8ec",
          },
          socialButtonsBlockButton__google: { color: "#e8e8ec" },
          formFieldLabel: { color: "#e8e8ec" },
          formFieldInput: {
            background: "#253352",
            border: "1px solid #3a4a70",
            color: "#e8e8ec",
          },
          footerActionText: { color: "#b4b4c0" },
          footerActionLink: { color: "#7c8cf0" },
          dividerLine: { background: "#3a4a70" },
          dividerText: { color: "#b4b4c0" },
          // UserButton popover (top-left avatar menu)
          userButtonPopoverCard: {
            background: "#1a1a2e",
            border: "1px solid #2a2a42",
          },
          userButtonPopoverMainIdentifier: { color: "#f5f5fa" },
          userButtonPopoverSecondaryIdentifier: { color: "#b4b4c0" },
          userPreviewMainIdentifier: { color: "#f5f5fa" },
          userPreviewSecondaryIdentifier: { color: "#b4b4c0" },
          userButtonPopoverActionButton: { color: "#e8e8ec" },
          userButtonPopoverActionButtonText: { color: "#e8e8ec" },
          userButtonPopoverActionButtonIcon: { color: "#b4b4c0" },
          userButtonPopoverFooter: {
            background: "#141424",
            borderTop: "1px solid #2a2a42",
          },
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
