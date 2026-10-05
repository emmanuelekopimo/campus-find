"use client";

import { useActionState } from "react";
import { claimAction, type FormState } from "@/app/actions/items";

export function ClaimForm({ itemId, type }: { itemId: number; type: "lost" | "found" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(claimAction, {});
  if (state.ok) return <div className="notice ok" data-testid="claim-sent">Message sent. The poster will see it under My posts and can contact you.</div>;
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} className="form" noValidate data-testid="claim-form" key={JSON.stringify(v)}>
      <input type="hidden" name="itemId" value={itemId} />
      {e.form && <div className="form-error" role="alert">{e.form}</div>}
      <div className="field" data-invalid={!!e.message}>
        <label htmlFor="message">{type === "found" ? "Why is it yours?" : "Where did you find it?"}</label>
        <textarea id="message" name="message" className="textarea" style={{ minHeight: 96 }} defaultValue={v.message}
          placeholder={type === "found" ? "Describe something only the owner would know: marks, contents, lock screen." : "Say where and when you found it and where it is now."} />
        {e.message && <span className="error">{e.message}</span>}
      </div>
      <div className="field" data-invalid={!!e.contact}>
        <label htmlFor="contact">Phone (optional)</label>
        <input id="contact" name="contact" className="input" inputMode="tel" defaultValue={v.contact} placeholder="0803 123 4567" />
        {e.contact && <span className="error">{e.contact}</span>}
      </div>
      <button className="btn btn-white" disabled={pending} data-testid="send-claim">{pending ? "Sending" : type === "found" ? "This is mine, send claim" : "I found it, send message"}</button>
    </form>
  );
}
