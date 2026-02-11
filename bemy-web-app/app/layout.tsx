import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Cat dots</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#e91e63" />
        <meta name="description" content="A cute interactive Connect The Dots game for Valentine's Day!" />
        <meta property="og:title" content="Be My Valentine - Connect The Dots" />
        <meta property="og:description" content="A cute interactive Connect The Dots game for Valentine's Day!" />
        <meta property="og:image" content="/heart.svg" />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/heart.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/heart.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
