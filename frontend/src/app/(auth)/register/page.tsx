"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { AuthUserResponse } from "@/lib/auth";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d).+$/,
        "Password must contain both letters and numbers."
      ),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match.",
    path: ["password_confirmation"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { mutate: register, isPending, error: apiError } = useRegister();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
    },
  });

  function onSubmit(values: RegisterValues) {
    setSuccessMessage(null);
    register(values, {
      onSuccess: (data: AuthUserResponse) => {
        setSuccessMessage(
          data.message ||
            "Registration successful! Please check your email for verification."
        );
        form.reset();
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 422 && error.details) {
          const details = error.details as Record<string, string[]>;
          Object.keys(details).forEach((key) => {
            form.setError(key as keyof RegisterValues, {
              message: details[key][0],
            });
          });
        }
      },
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-white/20 bg-white/70 p-8 shadow-xl backdrop-blur-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Start Your Journey
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Create a cinematic invitation for your special day.
          </p>
        </div>

        {successMessage ? (
          <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        {apiError && !successMessage && (apiError as ApiError).status !== 422 ? (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {(apiError as ApiError).message ||
                "Something went wrong. Please try again."}
            </AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John & Jane"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="hello@example.com"
                      type="email"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="********"
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password_confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="********"
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-neutral-900 py-6 text-base font-semibold hover:bg-neutral-800"
              disabled={isPending}
            >
              {isPending ? "Creating your account..." : "Register Now"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center text-sm text-neutral-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-neutral-900 hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
