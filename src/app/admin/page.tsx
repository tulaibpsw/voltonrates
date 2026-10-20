import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = { title: "Rates Admin | Volt On" };

export default function AdminPage() {
  return <AdminApp />;
}
