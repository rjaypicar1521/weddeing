import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Features | Wedding Online",
  description:
    "Explore Wedding Online features: invitation builder, guest experience, live RSVP dashboard, reminders, analytics, and secure privacy controls.",
  openGraph: {
    title: "Wedding Online Features",
    description:
      "Beautiful invitation builder, mobile-first guest flow, live RSVPs, reminders, analytics, and secure privacy.",
    type: "website",
    url: "https://wedding-online.com/features",
  },
};

const demoVideoUrl = "";

const features = [
  {
    label: "Feature 01",
    title: "Beautiful Invitation Builder",
    description: "Drag-and-drop editing with 20+ templates for Filipino-first wedding storytelling.",
    bullets: ["Template-based styles", "Section reordering", "Live preview while editing"],
  },
  {
    label: "Feature 02",
    title: "Mobile-First Guest Experience",
    description: "Guests can RSVP anywhere, upload moments, and enjoy a smooth phone-first invitation journey.",
    bullets: ["Fast on mobile browsers", "Touch-friendly layouts", "Photo-ready sections"],
  },
  {
    label: "Feature 03",
    title: "Live RSVP Dashboard",
    description: "Track responses in real time with filters, summaries, and export-ready guest views.",
    bullets: ["Attendance insights", "Search and status filters", "CSV export support"],
  },
  {
    label: "Feature 04",
    title: "Smart Reminders",
    description: "Send reminder emails to pending guests so you can close RSVP gaps before wedding day.",
    bullets: ["Bulk reminder sends", "Targeted follow-ups", "Dashboard reminders workflow"],
  },
  {
    label: "Feature 05",
    title: "Unlimited Guests (Pro)",
    description: "Scale from intimate events to larger celebrations with Pro support for up to 250 guests.",
    bullets: ["25 guests on Free", "250 guests on Pro", "Upgrade prompts before limits"],
  },
  {
    label: "Feature 06",
    title: "Custom Domain (Pro)",
    description: "Use your own domain and direct guests to your wedding experience at yourwedding.com.",
    bullets: ["Domain verification flow", "Status checks in dashboard", "Fallback URL always available"],
  },
  {
    label: "Feature 07",
    title: "Invite Analytics",
    description: "Measure invite performance with open rates, trend views, and device-level engagement splits.",
    bullets: ["Open-rate tracking", "Timeline insights", "Device breakdown visibility"],
  },
  {
    label: "Feature 08",
    title: "Secure and Private",
    description: "Built with privacy-first controls, secure access flows, and a clean experience without ads.",
    bullets: ["Code-gated guest access", "Session + token auth model", "GDPR-aligned data handling"],
  },
] as const;

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Wedding Online",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://wedding-online.com/features",
  description: "Filipino-first digital wedding invitation and RSVP platform.",
  offers: [
    {
      "@type": "Offer",
      name: "Free Plan",
      price: "0",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "Pro Plan",
      price: "29",
      priceCurrency: "USD",
    },
  ],
};

function MidPageCta() {
  return (
    <Card className="border-neutral-900 bg-neutral-900 text-white">
      <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-neutral-300">Ready to build your invite?</p>
          <h3 className="text-xl font-semibold">Start free and launch your wedding page today.</h3>
        </div>
        <Link href="/register">
          <Button className="bg-white text-neutral-900 hover:bg-neutral-100">Get Started Free</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function FeaturesPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />

      <header className="space-y-3">
        <Badge className="border-sky-200 bg-sky-50 text-sky-700">Features</Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Everything to run your wedding online</h1>
        <p className="max-w-3xl text-neutral-700">
          Wedding Online helps couples publish beautiful digital invitations, collect RSVPs, and manage guests with
          confidence across mobile and desktop.
        </p>
      </header>

      {features.map((feature, index) => {
        const odd = index % 2 === 1;
        return (
          <section key={feature.title} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className={odd ? "md:order-2" : ""}>
                <CardHeader>
                  <Badge className="w-fit border-neutral-300 bg-white text-neutral-700">{feature.label}</Badge>
                  <CardTitle className="text-2xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-neutral-700">
                  <p>{feature.description}</p>
                  <ul className="space-y-2 text-sm">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br from-white to-neutral-100 ${odd ? "md:order-1" : ""}`}>
                <CardContent className="flex h-full min-h-56 flex-col justify-center p-6">
                  <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">What couples unlock</p>
                  <p className="mt-3 text-lg font-semibold text-neutral-900">{feature.title}</p>
                  <p className="mt-2 text-sm text-neutral-700">
                    A guided, practical flow that keeps your invitation clear for guests and simple to manage.
                  </p>
                </CardContent>
              </Card>
            </div>

            {(index === 3 || index === 7) && <MidPageCta />}
          </section>
        );
      })}

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">60-second product walkthrough</h2>
        <Card>
          <CardContent className="p-4">
            {demoVideoUrl ? (
              <div className="aspect-video overflow-hidden rounded-lg border border-neutral-200">
                <iframe
                  title="Wedding Online demo video"
                  className="h-full w-full"
                  src={demoVideoUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-neutral-600">
                Demo video placeholder: add a 60-second YouTube screen recording URL in this page when ready.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
