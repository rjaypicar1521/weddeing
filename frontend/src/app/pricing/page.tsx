import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Pricing | Wedding Online",
  description:
    "Simple wedding invitation pricing with Free and Pro one-time options. Compare guests, domain support, and premium features.",
  openGraph: {
    title: "Wedding Online Pricing",
    description: "Simple pricing. No surprises. Compare Free and Pro one-time plans.",
    type: "website",
    url: "https://wedding-online.com/pricing",
  },
};

const stripeCheckoutUrl =
  process.env.NEXT_PUBLIC_STRIPE_TEST_CHECKOUT_URL ||
  process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL ||
  "/register";

const faqItems = [
  {
    question: "Why one-time payment?",
    answer:
      "Wedding Online is designed for event-based use, so most couples prefer a single payment instead of ongoing subscription billing.",
  },
  {
    question: "What if I need more than 250 guests?",
    answer:
      "If your event exceeds 250 guests, contact support and we can enable a higher-cap package for your invitation.",
  },
  {
    question: "Can I upgrade later?",
    answer:
      "Yes. You can start on Free, build your invitation, then upgrade to Pro any time before publishing or sending at scale.",
  },
  {
    question: "Money-back guarantee?",
    answer:
      "If Pro does not fit your use case, reach out to support within the policy window and we will review your refund request promptly.",
  },
];

const comparisonRows = [
  { feature: "Guests", free: "25", pro: "250" },
  { feature: "Custom Domain", free: "No", pro: "Yes" },
  { feature: "Priority Support", free: "No", pro: "Yes" },
  { feature: "CSV Export", free: "Yes", pro: "Yes" },
  { feature: "Reminders", free: "Yes", pro: "Yes" },
];

export default function PricingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
      <header className="space-y-3">
        <Badge className="border-sky-200 bg-sky-50 text-sky-700">Pricing</Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Simple pricing. No surprises.</h1>
        <p className="max-w-2xl text-neutral-700">Most couples choose Pro.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Start building today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-700">
            <p>25 guests</p>
            <p>Wedding Online URL</p>
            <p>Basic support</p>
            <p>No recurring fees</p>
            <Link href="/register">
              <Button variant="outline" className="mt-3 w-full">
                Get Started Free
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-neutral-900 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pro $29 one-time</CardTitle>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">Most Popular</Badge>
            </div>
            <CardDescription>Full wedding-scale package</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-700">
            <p>250 guests</p>
            <p>Custom domain</p>
            <p>Priority support</p>
            <p>No recurring fees</p>
            <a href={stripeCheckoutUrl}>
              <Button className="mt-3 w-full">Upgrade to Pro</Button>
            </a>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Frequently Asked Questions</h2>
        <Accordion>
          {faqItems.map((item) => (
            <AccordionItem key={item.question}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent className="text-sm text-neutral-700">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Plan Comparison</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Free</TableHead>
                  <TableHead>Pro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => (
                  <TableRow key={row.feature}>
                    <TableCell className="font-medium">{row.feature}</TableCell>
                    <TableCell>{row.free}</TableCell>
                    <TableCell>{row.pro}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
        <h3 className="text-2xl font-semibold tracking-tight">Ready to build your invitation?</h3>
        <p className="mt-2 text-sm text-neutral-700">Start free now and upgrade only when you need premium scale.</p>
        <div className="mt-4">
          <Link href="/register">
            <Button>Start Free Wedding</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
