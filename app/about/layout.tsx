import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Keeply — Built by a boater, for boaters",
  description:
    "Keeply is the vessel intelligence platform for serious boat owners. Meet Garry and Marty — the two boaters behind the app.",
  // TEMPORARY: hiding About from nav/footer/sitemap while Garry reworks copy.
  // To restore: delete the `robots` block below, re-add the /about entry in app/sitemap.ts,
  // re-add the nav + footer links in components/LandingPage.jsx.
  robots: { index: false, follow: false },
  alternates: { canonical: "https://keeply.boats/about" },
  openGraph: {
    title: "About Keeply — Built by a boater, for boaters",
    description:
      "Two boaters. One tool we wished someone else had built. Meet the team behind Keeply.",
    url: "https://keeply.boats/about",
    siteName: "Keeply",
    type: "website",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
