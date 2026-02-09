import React, { useEffect, useMemo, useState } from 'react';
import ManagerShell from './ManagerShell';
import { VALID_STAMP_CODES, REQUIRED_STAMP_COUNT, normalizeStampState } from '../../rewards';
import {
  addStampForUser,
  listenToCollection,
  removeStampForUser,
  resetStampsForUser,
  setRewardState,
  logActivity,
  getLoyaltyState,
  addPointsForUser,
} from '../../firebase';
import { useAuth } from '../AuthContext';

const RewardsManager = () => {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [manualCode, setManualCode] = useState(VALID_STAMP_CODES[0].id);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loyalty, setLoyalty] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const unsub = listenToCollection('rewardStamps', setRecords);
    return () => unsub && unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return records;
    const term = search.toLowerCase();
    return records.filter((r) => (r.userEmail || '').toLowerCase().includes(term) || (r.id || '').toLowerCase().includes(term));
  }, [records, search]);

  const selectedRecord = useMemo(
    () => filtered.find((r) => r.id === selected) || filtered[0],
    [filtered, selected]
  );

  const missingCodes =
    selectedRecord?.collectedStamps
      ? VALID_STAMP_CODES.filter((c) => !(selectedRecord.collectedStamps || []).includes(c.id))
      : VALID_STAMP_CODES;

  const stampGrid = useMemo(
    () =>
      VALID_STAMP_CODES.map((code) => ({
        ...code,
        filled: (selectedRecord?.collectedStamps || []).includes(code.id),
      })),
    [selectedRecord]
  );

  const doAction = async (fn, message) => {
    if (!selectedRecord?.id) return;
    setStatus('Working...');
    try {
      await fn();
      setStatus(message);
      setTimeout(() => setStatus(''), 2000);
    } catch (e) {
      setStatus(e.message || 'Error');
    }
  };

  const handleAddNext = () => {
    if (!missingCodes.length) {
      setStatus('All stamps already collected');
      return;
    }
    return doAction(
      () => addStampForUser(selectedRecord.id, selectedRecord.userEmail, missingCodes[0]?.id, 'admin_next'),
      'Added next stamp'
    );
  };

  const handleAddManual = () =>
    doAction(
      () => addStampForUser(selectedRecord.id, selectedRecord.userEmail, manualCode, 'admin_manual'),
      'Stamp applied'
    );

  const handleRemove = (stampId) =>
    doAction(
      () => removeStampForUser(selectedRecord.id, selectedRecord.userEmail, stampId, 'admin_remove'),
      'Removed stamp'
    );

  const handleReset = () =>
    doAction(() => resetStampsForUser(selectedRecord.id, selectedRecord.userEmail, 'admin_reset'), 'Reset');

  const toggleClaimed = () =>
    doAction(async () => {
      const next = normalizeStampState({
        ...(selectedRecord || {}),
        photoshootClaimed: !selectedRecord?.photoshootClaimed,
        photoshootUnlocked: true,
      });
      await setRewardState(selectedRecord.id, selectedRecord.userEmail, next, 'admin_toggle_claim');
      await logActivity({
        type: 'rewards:toggle_claim',
        uid: user?.uid,
        email: user?.email || '',
        target: selectedRecord.id,
        targetEmail: selectedRecord.userEmail,
        claimed: next.photoshootClaimed,
      });
    }, 'Updated claim flag');

  const loadLoyalty = async (uid, email) => {
    if (!uid) return;
    const state = await getLoyaltyState(uid);
    setLoyalty({ ...state, userEmail: email });
  };

  const handleAwardPoints = async (points) => {
    if (!selectedRecord?.id) return;
    const amountZar = points; // since redemption is 1:1, use points as amount reference
    setStatus('Adding GG points...');
    try {
      const res = await addPointsForUser({
        uid: selectedRecord.id,
        email: selectedRecord.userEmail,
        amountZar,
        source: 'admin_adjust',
        rolling12mSpend: loyalty?.rolling12mSpend || 0,
      });
      await loadLoyalty(selectedRecord.id, selectedRecord.userEmail);
      setStatus(`Added ${res.pointsAwarded || points} GG`);
    } catch (e) {
      setStatus(e.message || 'Error updating points');
    } finally {
      setTimeout(() => setStatus(''), 2000);
    }
  };

  return (
    <ManagerShell
      title="QR Stamp Rewards"
      description="Manage customer stamp wallets synced across QR scans and purchases."
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {records.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r.id)}
            className={`px-3 py-2 rounded border text-sm ${
              (selected || records[0]?.id) === r.id ? 'border-custom-gold text-black bg-custom-gold' : 'border-gray-700 text-gray-200'
            }`}
          >
            {r.userEmail || r.id}
          </button>
        ))}
      </div>

      {status && <p className="text-sm text-custom-gold mb-3">{status}</p>}

      {selectedRecord ? (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card border border-custom-gold/30 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-custom-gold">Progress</p>
                <h3 className="text-xl font-bold text-white">
                  Collected: {(selectedRecord.collectedStamps || []).length}/{REQUIRED_STAMP_COUNT}
                </h3>
                <p className="text-gray-400 text-sm">
                  Missing: {missingCodes.map((m) => m.displayName).join(', ') || 'None'}
                </p>
                <p className="text-gray-500 text-xs">User: {selectedRecord.userEmail || selectedRecord.id}</p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-bold ${
                    selectedRecord.photoshootUnlocked ? 'text-green-400' : 'text-gray-400'
                  }`}
                >
                  {selectedRecord.photoshootUnlocked ? 'Unlocked' : 'Locked'}
                </p>
                {selectedRecord.photoshootClaimed && <p className="text-xs text-green-300">Claim marked</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stampGrid.map((stamp, idx) => (
                <div
                  key={stamp.id}
                  className={`rounded-lg p-3 border text-center ${
                    stamp.filled
                      ? 'border-custom-gold bg-custom-gold/15 text-white'
                      : 'border-gray-800 bg-black/30 text-gray-400'
                  }`}
                >
                  <div
                    className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-extrabold ${
                      stamp.filled ? 'bg-custom-gold text-black' : 'bg-gray-800 text-white'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <p className="text-sm font-bold mt-2">{stamp.displayName}</p>
                  <p className="text-[11px] text-gray-500">{stamp.filled ? 'Collected' : 'Pending'}</p>
                  {stamp.filled && (
                    <button
                      onClick={() => handleRemove(stamp.id)}
                      className="mt-2 text-[11px] text-red-300 underline hover:text-red-200"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-card border border-gray-800 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-white">Quick actions</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleAddNext}
                  className="px-4 py-2 rounded bg-custom-gold text-black font-bold hover:bg-white transition"
                >
                  Add Next Stamp
                </button>
                <button
                  onClick={toggleClaimed}
                  className="px-4 py-2 rounded border border-green-400 text-green-300 font-semibold hover:bg-green-500/20 transition"
                >
                  {selectedRecord.photoshootClaimed ? 'Unmark Claim' : 'Mark Claimed'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded border border-gray-700 text-gray-200 hover:border-red-400 hover:text-red-200 transition"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="glass-card border border-gray-800 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-white">Add a specific stamp</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                >
                  {VALID_STAMP_CODES.map((code) => (
                    <option key={code.id} value={code.id}>
                      {code.displayName}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddManual}
                  className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 transition"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">No reward records found yet.</p>
      )}
    </ManagerShell>
  );
};

export default RewardsManager;
