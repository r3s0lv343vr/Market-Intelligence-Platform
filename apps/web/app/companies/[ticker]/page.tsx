import { notFound } from "next/navigation";
import { CompanyView } from "@/components/CompanyView";
import { getEntity, getPack } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const entity = getEntity(ticker);
  if (!entity) notFound();

  const pack = getPack(ticker);
  if (!pack) {
    return (
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-mute">
          SIC {entity.sic} · coverage tier {entity.coverageTier}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {entity.name} <span className="text-mute font-medium">{entity.ticker}</span>
        </h1>
        <p className="text-sm leading-6 text-mute">
          This name is in the entity table but is not in the live pack. Tier {entity.coverageTier}{" "}
          names are identity-only until silver/gold covers them. No statements are invented.
        </p>
      </div>
    );
  }

  return <CompanyView pack={pack} />;
}
