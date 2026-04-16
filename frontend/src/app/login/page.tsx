import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "Login | Wedding Online",
  description: "Access your Wedding Online dashboard.",
  openGraph: {
    title: "Login | Wedding Online",
    description: "Access your Wedding Online dashboard.",
    type: "website",
    url: "https://wedding-online.com/login",
  },
};

export default function LoginPage() {
  return <LoginForm />;
}
