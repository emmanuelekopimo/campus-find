import Link from "next/link";
import { Inbox, LayoutGrid, LogOut, PlusCircle, Send } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { avatarUri } from "@/lib/avatar";
import type { User } from "@/db/schema";

type Active = "feed" | "post" | "mine" | "claims";

export function Shell({ user, active, pendingForMe = 0, children }: { user: User; active: Active; pendingForMe?: number; children: React.ReactNode }) {
  const links = [
    { key: "feed", href: "/", label: "Feed", Icon: LayoutGrid },
    { key: "post", href: "/post", label: "Post item", Icon: PlusCircle },
    { key: "mine", href: "/mine", label: "My posts", Icon: Inbox, badge: pendingForMe },
    { key: "claims", href: "/claims", label: "My claims", Icon: Send },
  ] as const;
  return (
    <div className="shell">
      <aside className="side">
        <Link href="/" className="brand"><img src="/logo.svg" alt="" />campusfind</Link>
        <nav aria-label="Main">
          {links.map(({ key, href, label, Icon, ...rest }) => (
            <Link key={key} href={href} className="navlink" aria-current={active === key ? "page" : undefined} data-testid={`nav-${key}`}>
              <Icon size={19} /> {label}
              {"badge" in rest && rest.badge ? <span className="badge" data-testid="pending-badge">{rest.badge}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="me">
          <img src={avatarUri(user.email)} alt="" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <b>{user.name}</b>
            <span className="muted">{user.department}</span>
          </div>
          <form action={logout}><button className="icon-btn" aria-label="Sign out" title="Sign out" data-testid="logout"><LogOut size={16} /></button></form>
        </div>
      </aside>
      <header className="mtop">
        <Link href="/" className="brand"><img src="/logo.svg" alt="" />campusfind</Link>
        <form action={logout}><button className="icon-btn" aria-label="Sign out"><LogOut size={16} /></button></form>
      </header>
      <main className="main">{children}</main>
      <nav className="mtabs" aria-label="Main mobile">
        {links.map(({ key, href, label, Icon }) => (
          <Link key={key} href={href} aria-current={active === key ? "page" : undefined}>
            <Icon size={20} /> {label.replace("Post item", "Post")}
          </Link>
        ))}
      </nav>
    </div>
  );
}
