import { ComingSoon } from "@/components/dashboard/coming-soon";
import { Boxes } from "lucide-react";

export default function InventoryPage() {
  return (
    <ComingSoon
      title="Inventory"
      description="Stock counters and low-stock alerts land here after beta launch."
      icon={Boxes}
    />
  );
}
