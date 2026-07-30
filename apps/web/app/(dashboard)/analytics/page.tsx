import { ComingSoon } from "@/components/dashboard/coming-soon";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <ComingSoon
      title="Analytics"
      description="Revenue, best products, and sales-by-city reports land here after beta launch."
      icon={BarChart3}
    />
  );
}
