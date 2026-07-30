import { ComingSoon } from "@/components/dashboard/coming-soon";
import { Users } from "lucide-react";

export default function CustomersPage() {
  return (
    <ComingSoon
      title="Customers"
      description="Your customer list builds automatically as orders come in. This screen is built in Phase 7."
      icon={Users}
    />
  );
}
