import "./globals.css";

export const metadata = {
  title: "ES AutoFill",
  description: "エントリーシート自動入力サービス",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
