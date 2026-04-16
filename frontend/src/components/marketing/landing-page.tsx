"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const featureCards = [
  {
    title: "Custom Invitations",
    description: "Design beautiful digital invites with themes tailored for your wedding style.",
  },
  {
    title: "Live RSVPs",
    description: "Track guest attendance in real time and keep your count accurate.",
  },
  {
    title: "Guest Management",
    description: "Organize guests, reminders, and updates from one clear dashboard.",
  },
  {
    title: "Mobile-First",
    description: "Built for phones first, so every guest experience feels smooth and fast.",
  },
];

const testimonials = [
  {
    name: "Alyssa & Marco",
    quote: "Setup took minutes, and our guests loved how polished everything looked.",
  },
  {
    name: "Denise & Paolo",
    quote: "RSVP tracking saved us days of back-and-forth messages.",
  },
  {
    name: "Carla & Jun",
    quote: "From invite to guest updates, everything was easy to manage in one place.",
  },
];

export function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
      <motion.section
        className="hero-gradient rounded-2xl border border-neutral-200 bg-gradient-to-br from-amber-50 via-white to-rose-50 p-6 shadow-sm backdrop-blur-sm sm:p-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Badge className="mb-3 border-amber-200 bg-amber-50 text-amber-700">Wedding Online</Badge>
        <h1 className="mb-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          <span className="bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">
            Wedding Online
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-neutral-700 sm:text-lg">
          Build your invitation, collect RSVPs, and manage guests with a single mobile-friendly platform.
        </p>

        <div className="mt-8 flex max-w-md flex-col gap-4 sm:flex-row">
          <a
            href="/register"
            className="inline-flex h-14 w-full items-center justify-center rounded-md bg-gradient-to-r from-amber-500 to-amber-600 px-6 text-base font-medium text-white transition-colors hover:from-amber-600 hover:to-amber-700 sm:w-auto"
          >
            Create Free Wedding
          </a>
          <a
            href="/login"
            className="inline-flex h-14 w-full items-center justify-center rounded-md border-2 border-neutral-200 bg-white px-6 text-base font-medium text-neutral-900 transition-colors hover:border-neutral-300 hover:bg-white sm:w-auto"
          >
            Log In
          </a>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45 }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {featureCards.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-700">{feature.description}</CardContent>
          </Card>
        ))}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45 }}
        className="rounded-2xl border border-neutral-200 bg-white/70 p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">10,000+ couples</Badge>
          <Badge className="border-blue-200 bg-blue-50 text-blue-700">4.9 star - 528 reviews</Badge>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <Card key={item.name} className="bg-white">
              <CardContent className="pt-6 text-sm text-neutral-700">
                <p>&quot;{item.quote}&quot;</p>
                <p className="mt-3 font-medium text-neutral-900">{item.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45 }}
        className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <h2 className="text-2xl font-semibold">Simple pricing for every couple</h2>
        <p className="mt-2 text-neutral-700">Start free or unlock Pro for full guest and design flexibility.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/pricing"
            className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50"
          >
            View Pricing
          </a>
          <a
            href="/register"
            className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Get Started
          </a>
        </div>
      </motion.section>
    </main>
  );
}
