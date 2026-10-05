import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return (
    <main className="login">
      <aside className="login-art">
        <img src="/images/scenes/students-steps.jpg" alt="Students sitting on campus steps" />
        <div className="over">
          <p className="mono muted" style={{ fontSize: 12, letterSpacing: "0.12em", marginBottom: 10 }}>UNIVERSITY OF UYO</p>
          <h2>Lost it on campus? Someone probably found it.</h2>
        </div>
      </aside>
      <section className="login-form">
        <div className="inner">
          <img src="/logo.svg" alt="" style={{ width: 52, height: 52, borderRadius: 14, border: "1px solid var(--line-2)", marginBottom: 26 }} />
          <h1 style={{ fontSize: 32 }}>Sign in to campusfind</h1>
          <p className="muted" style={{ margin: "8px 0 28px" }}>Post lost and found items, get match suggestions and message the finder.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
