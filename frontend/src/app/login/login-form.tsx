"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { login } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [status, setStatus] = useState("");
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setStatus("");

    try {
      const loginResponse = await login({
        email: values.email.trim(),
        password: values.password,
      });
      setUser(loginResponse.user);
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        setStatus(error.message);
      } else if (error instanceof Error) {
        setStatus(error.message);
      } else {
        setStatus("Unable to login.");
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Continue to your wedding dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <Input
              type="email"
              placeholder="Email address"
              aria-label="Email address"
              autoComplete="email"
              {...form.register("email")}
            />
            {form.formState.errors.email ? <p className="text-sm text-red-700">{form.formState.errors.email.message}</p> : null}
            <Input
              type="password"
              placeholder="Password"
              aria-label="Password"
              autoComplete="current-password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? <p className="text-sm text-red-700">{form.formState.errors.password.message}</p> : null}
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Signing in..." : "Continue"}
            </Button>
          </form>
          {status ? <p className="text-sm text-red-700">{status}</p> : null}
          <p className="text-xs text-neutral-600">
            New here?{" "}
            <a href="/register" className="font-medium underline">
              Create Wedding
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
