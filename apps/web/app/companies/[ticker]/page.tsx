import { notFound } from "next/navigation";
import { CompanyView } from "@/components/CompanyView";
import { getPack } from "@/lib/warehouse";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const pack = getPack(ticker);
  if (!pack) notFound();
  return <CompanyView pack={pack} />;
}
