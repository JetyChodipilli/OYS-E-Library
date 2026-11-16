import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {default: "OYS E-Library · Student Learning", template: "%s · OYS E-Library"},
  description: "Arctic Blue E-Library UI design prototype for OYS partner colleges. All content is sample data.",
  robots: {index: false, follow: false}
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
