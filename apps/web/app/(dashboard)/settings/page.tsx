import Link from "next/link";
import { Store, CreditCard, Users, ChevronRight } from "lucide-react";

type SettingsSection = {
  label: string;
  description: string;
  href: string;
  icon: typeof Store;
  available: boolean;
};

const SECTIONS: SettingsSection[] = [
  {
    label: "Store",
    description: "Name, description, WhatsApp number, country, currency, logo, and ad tracking Pixel IDs.",
    href: "/settings/store",
    icon: Store,
    available: true,
  },
  {
    label: "Billing",
    description: "Manage your subscription and payment details.",
    href: "/settings/billing",
    icon: CreditCard,
    available: false,
  },
  {
    label: "Team",
    description: "Invite staff to help manage your store.",
    href: "/settings/team",
    icon: Users,
    available: false,
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Manage your store and account.</p>

      <div className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const content = (
            <div className="flex items-center gap-4 px-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-500">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{section.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{section.description}</p>
              </div>
              {section.available ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <span className="shrink-0 text-xs text-slate-400">Coming soon</span>
              )}
            </div>
          );

          return section.available ? (
            <Link key={section.href} href={section.href} className="block hover:bg-slate-50 transition-colors">
              {content}
            </Link>
          ) : (
            <div key={section.href} className="opacity-60 cursor-not-allowed">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
