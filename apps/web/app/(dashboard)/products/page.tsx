import { ComingSoon } from "@/components/dashboard/coming-soon";
import { Package } from "lucide-react";

export default function ProductsPage() {
  return (
    <ComingSoon
      title="Products"
      description="Add and manage your products here. This screen is built in Phase 4."
      icon={Package}
    />
  );
}
