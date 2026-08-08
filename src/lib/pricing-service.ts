import { db } from "./db";

const defaultPricingConfig = {
  surgeMultiplier: 1.1,
  occupancyThreshold: 0.6,
  commissionRate: 5.0,
  surgeEnabled: true,
  seatLockTimeout: 5,
};

type PricingConfig = Awaited<ReturnType<typeof db.pricingConfig.findFirst>>;
let cachedConfig: PricingConfig = null;
let configPromise: Promise<NonNullable<PricingConfig>> | undefined;

export async function getPricingConfig() {
  if (cachedConfig) return cachedConfig;
  if (!configPromise) {
    configPromise = db.pricingConfig.findUnique({ where: { configKey: "default" } }).then(async (config) => {
      if (config) return config;
      return db.pricingConfig.create({ data: { ...defaultPricingConfig, configKey: "default" } });
    });
  }
  cachedConfig = await configPromise;
  configPromise = undefined;
  return cachedConfig;
}

export async function updatePricingConfig(data: {
  surgeMultiplier?: number;
  occupancyThreshold?: number;
  commissionRate?: number;
  surgeEnabled?: boolean;
  seatLockTimeout?: number;
}) {
  const config = await getPricingConfig();
  const updated = await db.pricingConfig.update({
    where: { id: config.id },
    data,
  });
  cachedConfig = updated;
  return updated;
}
