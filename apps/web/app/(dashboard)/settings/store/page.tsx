import { getStoreSettings } from "./actions";
import { StoreSettingsForm } from "./store-settings-form";

/**
 * No auth/store guard needed here beyond what (dashboard)/layout.tsx
 * already enforces — anyone reaching this route is already authenticated
 * with a confirmed store. getStoreSettings() itself still defensively
 * re-checks (returns an error result rather than assuming), consistent
 * with how every other server action in this app validates independently
 * rather than trusting the caller reached it "the right way".
 */
export default async function StoreSettingsPage() {
  const result = await getStoreSettings();

  if (!result.success) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-lg font-semibold text-slate-900">Store settings</h1>
        <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {result.error}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-slate-900">Store settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Update your store details, WhatsApp number, and ad tracking Pixel IDs.
      </p>
      <div className="mt-6">
        <StoreSettingsForm storeId={result.storeId} initialData={result.data} />
      </div>
    </div>
  );
}
