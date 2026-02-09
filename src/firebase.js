// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { createUserWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import {
  addNextMissingStamp,
  addStampToState,
  normalizeStampState,
  STAMP_DEFAULT_STATE,
  VALID_STAMP_CODES,
} from './rewards';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyABNEOxM34YDCTHhBFAdkfZR-k0CiIAZHA",
  authDomain: "gotoguys-web.firebaseapp.com",
  projectId: "gotoguys-web",
  storageBucket: "gotoguys-web.firebasestorage.app",
  messagingSenderId: "975443943258",
  appId: "1:975443943258:web:403c932f2e657780681d63",
  measurementId: "G-TEZKJTQDXD"
};

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// --- 1. FUNCTION: SAVE SUBSCRIBERS ---
export const addSubscriber = async (email) => {
  try {
    if(!email) return { success: false, error: "No email provided" };
    
    await addDoc(collection(db, "subscribers"), {
      email: email,
      joinedAt: serverTimestamp(),
      source: "website_footer"
    });
    return { success: true };
  } catch (error) {
    console.error("Error adding subscriber: ", error);
    return { success: false, error: error.message };
  }
};

// --- 2. FUNCTION: SAVE ORDERS (After Yoco Payment) ---
export const saveOrder = async (orderDetails) => {
  try {
    await addDoc(collection(db, "orders"), {
      ...orderDetails,
      status: "paid",
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error saving order: ", error);
    return { success: false, error: error.message };
  }
};

// --- 3. FUNCTION: SAVE LEADS (From Contact Form or Modal) ---
export const saveLead = async (leadData) => {
  try {
    await addDoc(collection(db, "leads"), {
      ...leadData,
      status: "new",
      receivedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error saving lead: ", error);
    return { success: false, error: error.message };
  }
};

export const getUserRole = async (uid) => {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'userRoles', uid));
  return snap.exists() ? snap.data().role : null;
};

export const setUserRole = async (uid, email, role) =>
  setDoc(doc(db, 'userRoles', uid), { email, role, updatedAt: serverTimestamp() }, { merge: true });

export const createAuthUser = async ({ email, password, role = 'user' }) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setUserRole(cred.user.uid, email, role);
  return cred.user;
};

// Activity logging
export const logActivity = async (data) =>
  addDoc(collection(db, 'activityLogs'), { ...data, createdAt: serverTimestamp() });

export const listenToActivity = (callback) => {
  const q = query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
};
// Ensure a user doc exists (defaults to read-only)
export const ensureUserDoc = async (uid, email) => {
  if (!uid) return { created: false };
  const ref = doc(db, 'userRoles', uid);
  const snap = await getDoc(ref);
  // Only create a default doc if none exists; do not overwrite an existing role
  if (!snap.exists()) {
    await setDoc(
      ref,
      { email: email || '', role: 'user', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
    );
    return { created: true };
  }
  return { created: false };
};

// Generic CRUD helpers for the managers
export const listenToCollection = (name, callback) => {
  const q = query(collection(db, name), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
};

export const createItem = async (name, data) =>
  addDoc(collection(db, name), { ...data, createdAt: serverTimestamp() });

export const updateItem = async (name, id, data) =>
  updateDoc(doc(db, name, id), { ...data, updatedAt: serverTimestamp() });

export const deleteItem = async (name, id) => deleteDoc(doc(db, name, id));

// Reward stamp storage (Firestore-backed, with shared helpers)
export const getRewardState = async (uid) => {
  if (!uid) return null;
  const ref = doc(db, 'rewardStamps', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return normalizeStampState(snap.data());
};

export const setRewardState = async (uid, email, state, reason = 'manual') => {
  if (!uid) return null;
  const ref = doc(db, 'rewardStamps', uid);
  const next = normalizeStampState(state);
  await setDoc(
    ref,
    {
      ...next,
      userEmail: email || '',
      updatedAt: serverTimestamp(),
      createdAt: next.createdAt || serverTimestamp(),
      lastReason: reason,
    },
    { merge: true }
  );
  return next;
};

export const ensureRewardDoc = async (uid, email) => {
  if (!uid) return null;
  const ref = doc(db, 'rewardStamps', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...STAMP_DEFAULT_STATE, userEmail: email || '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { created: true, state: { ...STAMP_DEFAULT_STATE } };
  }
  return { created: false, state: normalizeStampState(snap.data()) };
};

export const grantSignupStamp = async (uid, email) => {
  if (!uid) return null;
  const existing = (await getRewardState(uid)) || { ...STAMP_DEFAULT_STATE };
  const next = addNextMissingStamp(existing);
  const saved = await setRewardState(uid, email, next, 'signup_bonus');
  await logActivity({ type: 'rewards:signup_stamp', uid, email, collected: saved.collectedStamps });
  return saved;
};

export const addStampForUser = async (uid, email, stampId, reason = 'manual') => {
  if (!uid || !stampId) return null;
  const current = (await getRewardState(uid)) || { ...STAMP_DEFAULT_STATE };
  const next = addStampToState(current, stampId);
  const saved = await setRewardState(uid, email, next, reason);
  await logActivity({ type: 'rewards:add', uid, email, stampId, collected: saved.collectedStamps, reason });
  return saved;
};

export const removeStampForUser = async (uid, email, stampId, reason = 'manual_remove') => {
  if (!uid || !stampId) return null;
  const current = (await getRewardState(uid)) || { ...STAMP_DEFAULT_STATE };
  const next = normalizeStampState({
    ...current,
    collectedStamps: (current.collectedStamps || []).filter((id) => id !== stampId),
  });
  const saved = await setRewardState(uid, email, next, reason);
  await logActivity({ type: 'rewards:remove', uid, email, stampId, collected: saved.collectedStamps, reason });
  return saved;
};

export const resetStampsForUser = async (uid, email, reason = 'manual_reset') => {
  if (!uid) return null;
  const saved = await setRewardState(uid, email, { ...STAMP_DEFAULT_STATE }, reason);
  await logActivity({ type: 'rewards:reset', uid, email, reason });
  return saved;
};

// --- Loyalty / GG Points ---
const DEFAULT_LOYALTY_STATE = {
  balance: 0, // GG points
  tier: 'SCOUT',
  rolling12mSpend: 0,
  totalEarnedPoints: 0,
};

const toPriceNumber = (price) => {
  if (typeof price === 'number') return price;
  if (price === null || price === undefined) return 0;
  const numeric = parseInt(String(price).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const ensureLoyaltyDoc = async (uid, email) => {
  if (!uid) return { created: false };
  const ref = doc(db, 'loyaltyUsers', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...DEFAULT_LOYALTY_STATE, userEmail: email || '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { created: true, state: { ...DEFAULT_LOYALTY_STATE } };
  }
  return { created: false, state: { ...DEFAULT_LOYALTY_STATE, ...snap.data() } };
};

export const getLoyaltyState = async (uid) => {
  if (!uid) return { ...DEFAULT_LOYALTY_STATE };
  const ref = doc(db, 'loyaltyUsers', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ...DEFAULT_LOYALTY_STATE };
  return { ...DEFAULT_LOYALTY_STATE, ...snap.data() };
};

export const redeemCartWithPoints = async ({ uid, email, cartItems = [] }) => {
  if (!uid) throw new Error('User required');
  const sanitizedItems = (cartItems || []).map((item) => ({
    id: item.id || '',
    name: item.name || '',
    qty: item.qty || 1,
    price: item.price || 0,
    category: item.category || '',
    image: item.image || '',
  }));

  const total = sanitizedItems.reduce((sum, item) => {
    const priceVal = toPriceNumber(item.price);
    return sum + priceVal * (item.qty || 1);
  }, 0);

  if (total <= 0) throw new Error('Cart total must be positive');

  const userRef = doc(db, 'loyaltyUsers', uid);
  const ledgerRef = doc(collection(db, 'pointLedger'));
  const orderRef = doc(collection(db, 'orders'));

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const current = snap.exists() ? snap.data() : { ...DEFAULT_LOYALTY_STATE };
    const balance = current.balance || 0;
    if (balance < total) {
      throw new Error('Insufficient GG balance');
    }
    const newBalance = balance - total;

    tx.set(
      userRef,
      {
        ...DEFAULT_LOYALTY_STATE,
        ...current,
        balance: newBalance,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(ledgerRef, {
      userId: uid,
      type: 'REDEEM',
      amount: -total,
      createdAt: serverTimestamp(),
      meta: { paymentMethod: 'GG_POINTS', total, itemCount: sanitizedItems.length },
    });

    tx.set(orderRef, {
      items: sanitizedItems,
      total,
      paymentMethod: 'GG_POINTS',
      status: 'paid',
      userId: uid,
      userEmail: email || '',
      createdAt: serverTimestamp(),
    });

    return { newBalance };
  });

  return { success: true, newBalance: result.newBalance };
};

export const addPointsForUser = async ({ uid, email, amountZar = 0, source = 'purchase', meta = {}, rolling12mSpend = 0 }) => {
  if (!uid) throw new Error('User required');
  const amount = Number(amountZar) || 0;
  if (amount <= 0) return { success: false, message: 'Amount must be positive', pointsAwarded: 0 };

  // Compute earn rate based on rolling spend if provided
  const spend = Number(rolling12mSpend) || 0;
  let earnRatePercent = 3.5;
  if (spend >= 70_001) earnRatePercent = 7.5;
  else if (spend >= 45_001) earnRatePercent = 6.5;
  else if (spend >= 25_001) earnRatePercent = 5.5;
  else if (spend >= 15_001) earnRatePercent = 4.5;

  const points = Math.floor(amount * (earnRatePercent / 100));
  if (points <= 0) return { success: false, message: 'No points to award', pointsAwarded: 0 };

  const userRef = doc(db, 'loyaltyUsers', uid);
  const ledgerRef = doc(collection(db, 'pointLedger'));

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const current = snap.exists() ? snap.data() : { ...DEFAULT_LOYALTY_STATE };
    const newBalance = (current.balance || 0) + points;
    const totalEarned = (current.totalEarnedPoints || 0) + points;

    tx.set(
      userRef,
      {
        ...DEFAULT_LOYALTY_STATE,
        ...current,
        balance: newBalance,
        totalEarnedPoints: totalEarned,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(ledgerRef, {
      userId: uid,
      type: 'EARN',
      amount: points,
      createdAt: serverTimestamp(),
      meta: { source, amountZar: amount, ...meta },
    });

    return { newBalance, pointsAwarded: points };
  });

  return { success: true, ...result };
};

export {
  app,
  auth,
  db,
};
