"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  FileCode,
  Globe,
  Loader2,
  Mail,
  Network,
  ShieldBan,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { useSession } from "@/components/providers/session-provider";
import { AdminHeader } from "@/components/admin-header";

interface SectionCard {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
}

const EMAIL_CARDS: SectionCard[] = [
  {
    href: "/relays",
    icon: Mail,
    title: "SMTP Relays",
    description: "Manage relay servers, monitor status and daily send volume.",
    cta: "Manage relays",
  },
  {
    href: "/senders",
    icon: UserRound,
    title: "Sender Identities",
    description: 'Manage "from" names available for outgoing emails.',
    cta: "Manage senders",
  },
];

const PORTAL_CARDS: SectionCard[] = [
  {
    href: "/domains",
    icon: Globe,
    title: "Domains",
    description: "Root domains whose subdomains route to portals.",
    cta: "Manage domains",
  },
  {
    href: "/sites",
    icon: FileCode,
    title: "Portal Sites",
    description: "Upload HTML portals and define pages and autofill fields.",
    cta: "Manage sites",
  },
  {
    href: "/subdomains",
    icon: Network,
    title: "Subdomains",
    description: "Point portal hostnames at sites and control availability.",
    cta: "Manage subdomains",
  },
  {
    href: "/sessions",
    icon: Activity,
    title: "Sessions",
    description: "Monitor live portal sessions, captures and expiries.",
    cta: "View sessions",
  },
  {
    href: "/bans",
    icon: ShieldBan,
    title: "IP Bans",
    description: "Block visitors from all portals with a faux 404.",
    cta: "Manage bans",
  },
];

function CardGrid({ cards }: { cards: SectionCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="group flex flex-col justify-between rounded-3xl border border-border bg-background p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <card.icon className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">{card.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
            {card.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="mb-6 text-xl font-semibold">Dashboard</h2>

        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Email
        </p>
        <CardGrid cards={EMAIL_CARDS} />

        <p className="mb-3 mt-10 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Web Portals
        </p>
        <CardGrid cards={PORTAL_CARDS} />
      </main>
    </div>
  );
}