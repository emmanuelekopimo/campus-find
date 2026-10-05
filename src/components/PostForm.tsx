"use client";

import { useActionState, useState } from "react";
import { ImagePlus } from "lucide-react";
import { postItemAction, type FormState } from "@/app/actions/items";
import { CATEGORIES } from "@/db/schema";

export const PLACES = [
  "University Library", "Faculty of Science", "Faculty of Engineering", "Faculty of Arts", "Faculty of Law", "Faculty of Pharmacy",
  "ICT Centre", "Main Auditorium", "Cafeteria, Main Campus", "Students' Union Building", "Sports Complex", "Shuttle Bus Park",
  "Hostel A (Male)", "Female Hostel Block C", "Chapel of Redemption", "Senate Building", "Main Gate",
];

export function PostForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(postItemAction, {});
  const [preview, setPreview] = useState<string | null>(null);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} className="form" noValidate key={JSON.stringify(v)} data-testid="post-form">
      {Object.keys(e).length > 0 && <div className="form-error" role="alert">Some fields need attention.</div>}
      <div className="field" data-invalid={!!e.type}>
        <span className="label">I have</span>
        <div className="type-toggle">
          <label><input type="radio" name="type" value="lost" defaultChecked={v.type === "lost"} /><i className="dot dot-lost" /><div><b>Lost something</b><span className="muted" style={{ fontSize: 13 }}>Tell finders what to look for</span></div></label>
          <label><input type="radio" name="type" value="found" defaultChecked={v.type === "found"} /><i className="dot dot-found" /><div><b>Found something</b><span className="muted" style={{ fontSize: 13 }}>Help it get back to its owner</span></div></label>
        </div>
        {e.type && <span className="error">{e.type}</span>}
      </div>
      <div className="field" data-invalid={!!e.title}>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" className="input" defaultValue={v.title} placeholder="e.g. Black Casio calculator" />
        {e.title && <span className="error">{e.title}</span>}
      </div>
      <div className="row2">
        <div className="field" data-invalid={!!e.category}>
          <label htmlFor="category">Category</label>
          <select id="category" name="category" className="select" defaultValue={v.category ?? ""}>
            <option value="" disabled>Choose</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          {e.category && <span className="error">{e.category}</span>}
        </div>
        <div className="field" data-invalid={!!e.happenedOn}>
          <label htmlFor="happenedOn">Date</label>
          <input id="happenedOn" name="happenedOn" type="date" className="input" max={today} defaultValue={v.happenedOn ?? today} />
          {e.happenedOn && <span className="error">{e.happenedOn}</span>}
        </div>
      </div>
      <div className="field" data-invalid={!!e.location}>
        <label htmlFor="location">Where</label>
        <input id="location" name="location" className="input" list="places" defaultValue={v.location} placeholder="Pick a place or type your own" />
        <datalist id="places">{PLACES.map((p) => <option key={p} value={p} />)}</datalist>
        {e.location && <span className="error">{e.location}</span>}
      </div>
      <div className="field" data-invalid={!!e.description}>
        <label htmlFor="description">Details</label>
        <textarea id="description" name="description" className="textarea" defaultValue={v.description} placeholder="Colour, brand, marks, what was inside. For found items, leave out one detail so the real owner can prove it is theirs." />
        {e.description && <span className="error">{e.description}</span>}
      </div>
      <div className="field" data-invalid={!!e.photo}>
        <span className="label">Photo</span>
        <label className="drop">
          {preview ? <img className="thumb" src={preview} alt="Selected photo preview" /> : <span className="thumb"><ImagePlus size={26} /></span>}
          <div>
            <b style={{ fontWeight: 600 }}>{preview ? "Photo selected" : "Add a photo"}</b>
            <p className="hint">JPG, PNG or WebP up to 4 MB. Optional, but posts with photos get claimed faster.</p>
          </div>
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="sr-only" data-testid="photo-input"
            onChange={(ev) => { const f = ev.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
        </label>
        {e.photo && <span className="error">{e.photo}</span>}
      </div>
      <button className="btn btn-white btn-lg" disabled={pending} data-testid="submit-item">{pending ? "Posting" : "Post and check for matches"}</button>
    </form>
  );
}
