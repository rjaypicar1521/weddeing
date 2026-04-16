import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";

export const metadata: Metadata = {
  title: "Wedding Online | Beautiful digital invitations & RSVPs",
  description:
    "Create beautiful wedding invitations, track live RSVPs, and manage guests with a mobile-first experience.",
  openGraph: {
    title: "Wedding Online",
    description: "Beautiful digital invitations & RSVPs",
    type: "website",
    url: "https://wedding-online.com",
  },
};

const schemaJson = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Wedding Online",
  url: "https://wedding-online.com",
  description: "Beautiful digital invitations and RSVP platform for couples.",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "528",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson) }}
      />
      <LandingPage />
    </>
  );
}
