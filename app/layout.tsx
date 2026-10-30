import type { ReactNode } from "react";

export const metadata = {
  title: "Green Room",
  description: "Find the podcasts whose listeners already love your guest's work.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>{children}</body>
    </html>
  );
}
