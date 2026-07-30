import { ComingSoon } from "@/components/dashboard/coming-soon";
import { ShoppingBag } from "lucide-react";

export default function OrdersPage() {
  return (
    <ComingSoon
      title="Orders"
      description="Track and update order status here. This screen is built in Phase 7."
      icon={ShoppingBag}
    />
  );
}
