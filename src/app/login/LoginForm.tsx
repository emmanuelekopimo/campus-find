"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="form" noValidate>
      {state.errors?.form && <div className="form-error" role="alert">{state.errors.form}</div>}
      <div className="field" data-invalid={!!state.errors?.email}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" defaultValue={state.email ?? "student@uniuyo.edu.ng"} autoComplete="email" />
        {state.errors?.email && <span className="error">{state.errors.email}</span>}
      </div>
      <div className="field" data-invalid={!!state.errors?.password}>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" defaultValue="student123" autoComplete="current-password" />
        {state.errors?.password && <span className="error">{state.errors.password}</span>}
      </div>
      <button className="btn btn-white btn-lg btn-block" disabled={pending} data-testid="sign-in">
        {pending ? "Signing in" : "Continue"} <ArrowRight size={18} />
      </button>
      <div className="demo">
        <span>Demo account (prefilled)</span>
        <code>student@uniuyo.edu.ng / student123</code>
        <span>Every seeded student uses the same password, for example <code>ifiok.essien@student.uniuyo.edu.ng</code>.</span>
      </div>
    </form>
  );
}
