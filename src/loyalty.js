// Loyalty program constants and helpers for "The GoTo Guild"
export const CURRENCY_NAME = 'GG Points';
// Base earn rate is now tiered by rolling spend; see TIERS for brackets.
// 1 GG = R1 redemption value stays the same.
export const REDEMPTION_VALUE_PER_POINT = 1;

// Tiered earn percentages by rolling 12-month spend
// 0–15k: 3.5%, 15,001–25k: 4.5%, 25,001–45k: 5.5%, 45,001–70k: 6.5%, 70k+: 7.5%
export const TIERS = {
  SCOUT: { min: 0, max: 15_000, earnRatePercent: 3.5 },
  CAPTAIN: { min: 15_001, max: 25_000, earnRatePercent: 4.5 },
  GENERAL: { min: 25_001, max: 45_000, earnRatePercent: 5.5 },
  COMMANDER: { min: 45_001, max: 70_000, earnRatePercent: 6.5 },
  LEGEND: { min: 70_001, max: Infinity, earnRatePercent: 7.5 },
};

export const MISSIONS = {
  FIRST_BLOOD: { key: 'first_purchase', label: 'First Blood', points: 50 },
  LOUDSPEAKER: { key: 'review', label: 'The Loudspeaker (Review)', points: 100 },
  HEADHUNTER: { key: 'referral', label: 'The Headhunter (Referral)', points: 1000 },
};

export const getTierFromRollingSpend = (rollingSpend) => {
  if (rollingSpend >= TIERS.LEGEND.min) return 'LEGEND';
  if (rollingSpend >= TIERS.COMMANDER.min) return 'COMMANDER';
  if (rollingSpend >= TIERS.GENERAL.min) return 'GENERAL';
  if (rollingSpend >= TIERS.CAPTAIN.min) return 'CAPTAIN';
  return 'SCOUT';
};

export const getEarnRateForSpend = (rollingSpend) => {
  const tier = getTierFromRollingSpend(rollingSpend);
  return TIERS[tier]?.earnRatePercent ?? TIERS.SCOUT.earnRatePercent;
};

export const calculatePoints = (amountZar, currentTier = 'SCOUT', rollingSpend = 0) => {
  // Prefer an explicit tier if provided; otherwise derive from rolling spend
  const tierKey = currentTier || getTierFromRollingSpend(rollingSpend);
  const rate = TIERS[tierKey]?.earnRatePercent ?? TIERS.SCOUT.earnRatePercent;
  const points = Math.floor((Number(amountZar) || 0) * (rate / 100));
  return points > 0 ? points : 0;
};

export const nextTierProgress = (tier, rollingSpend) => {
  const order = ['SCOUT', 'CAPTAIN', 'GENERAL', 'COMMANDER', 'LEGEND'];
  const currentIndex = order.indexOf(tier);
  const nextTier = order[Math.min(order.length - 1, currentIndex + 1)];
  const target = nextTier === 'LEGEND' ? TIERS.LEGEND.min : TIERS[nextTier].min;
  const spendToNext = Math.max(0, target - rollingSpend);
  const progressPct = nextTier === tier ? 100 : Math.min(100, Math.round((rollingSpend / target) * 100));
  return { nextTier, spendToNext, progressPct };
};

export const formatRandValue = (points) => (points * REDEMPTION_VALUE_PER_POINT).toFixed(2);

// Generic redeem helper; expects data access functions to be injected.
export const redeemReward = async (userId, rewardId, deps) => {
  const { getUserBalance, getReward, deductPoints, addLedger } = deps;
  const [balance, reward] = await Promise.all([getUserBalance(userId), getReward(rewardId)]);
  if (!reward) return { success: false, message: 'Reward not found' };
  if (balance < reward.costPoints) return { success: false, message: 'Insufficient points' };

  await deductPoints(userId, reward.costPoints);
  await addLedger({ userId, type: 'REDEEM', amount: -reward.costPoints, meta: { rewardId } });
  return { success: true, newBalance: balance - reward.costPoints };
};

// Tier check helper; expects a rolling spend fetcher and tier updater.
export const checkAndUpgradeTier = async (userId, deps) => {
  const { getRolling12mServiceFee, updateTier } = deps;
  const spend = await getRolling12mServiceFee(userId);
  const tier = getTierFromRollingSpend(spend);
  await updateTier(userId, tier);
};
