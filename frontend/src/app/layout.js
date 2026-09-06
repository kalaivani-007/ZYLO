import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "ZYLO — AI Interior Designer",
  description: "Design your entire home with AI.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><NavBar />{children}</body></html>;
}
