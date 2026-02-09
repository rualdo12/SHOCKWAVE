// QR Stamp Rewards shared helpers
export const VALID_STAMP_CODES = [
  { id: 'TIER1', displayName: 'Tier 1', description: 'Reward Tier 1' },
  { id: 'TIER2', displayName: 'Tier 2', description: 'Reward Tier 2' },
  { id: 'TIER3', displayName: 'Tier 3', description: 'Reward Tier 3' },
  { id: 'TIER4', displayName: 'Tier 4', description: 'Reward Tier 4' },
  { id: 'TIER5', displayName: 'Tier 5', description: 'Reward Tier 5' },
  { id: 'TIER6', displayName: 'Tier 6', description: 'Reward Tier 6' },
];

export const STAMP_STORAGE_KEY = 'SHOCKWAVEStampRewards';
export const REQUIRED_STAMP_COUNT = 6;
export const STAMP_DEFAULT_STATE = {
  collectedStamps: [],
  photoshootUnlocked: false,
  photoshootClaimed: false,
};

export const normalizeStampState = (state = STAMP_DEFAULT_STATE) => {
  const safeState = state || STAMP_DEFAULT_STATE;
  const validStamps = Array.from(
    new Set((safeState.collectedStamps || []).filter((s) => VALID_STAMP_CODES.some((def) => def.id === s)))
  ).slice(0, REQUIRED_STAMP_COUNT);
  const isUnlocked = safeState.photoshootUnlocked || validStamps.length >= REQUIRED_STAMP_COUNT;
  return {
    ...STAMP_DEFAULT_STATE,
    ...safeState,
    collectedStamps: validStamps,
    photoshootUnlocked: isUnlocked,
  };
};

export const addNextMissingStamp = (state) => {
    const normalized = normalizeStampState(state);
    // Find the first code in VALID_STAMP_CODES that isn't in the user's collected list
    const nextCode = VALID_STAMP_CODES.map(c => c.id).find(id => !normalized.collectedStamps.includes(id));
    
    if (nextCode) {
        return addStampToState(normalized, nextCode);
    }
    // If full, ensure unlocked is true
    return { ...normalized, photoshootUnlocked: true };
};

export const addStampToState = (state, code) => {
    const normalized = normalizeStampState(state);
    
    // If code invalid or already exists, return current state
    if (!VALID_STAMP_CODES.some(c => c.id === code) || normalized.collectedStamps.includes(code)) {
        return normalized;
    }
    
    const newStamps = [...normalized.collectedStamps, code].slice(0, REQUIRED_STAMP_COUNT);
    
    return normalizeStampState({
        ...normalized,
        collectedStamps: newStamps
    });
};

export const getStoredStampState = () => {
  try {
    if (typeof localStorage === 'undefined') return { ...STAMP_DEFAULT_STATE };
    const raw = localStorage.getItem(STAMP_STORAGE_KEY);
    if (!raw) return { ...STAMP_DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return normalizeStampState(parsed);
  } catch {
    return { ...STAMP_DEFAULT_STATE };
  }
};

export const persistStampState = (state) => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STAMP_STORAGE_KEY, JSON.stringify(normalizeStampState(state)));
  } catch (_) {
    // ignore storage failures
  }
};

export const getCartItemCount = (cartItems = []) =>
  cartItems.reduce((total, item) => total + (item?.qty || 0), 0);
