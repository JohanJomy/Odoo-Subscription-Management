import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LoopLedger Subscription Management",
    short_name: "LoopLedger",
    description: "Invoices, payments, UPI collection, and revenue reporting.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    icons: [],
  };
}
