import React, { useEffect, useState } from 'react';
import { listenToCollection, setUserRole, createAuthUser, logActivity } from '../../firebase';
import { useAuth } from '../AuthContext';
import ManagerShell from './ManagerShell';


const empty = { email: '', password: '', role: 'user' };

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    // read from userRoles collection
    const unsub = listenToCollection('userRoles', setUsers);
    return () => unsub && unsub();
  }, []);

  const save = async () => {
    if (!form.email || !form.role) return setStatus('Email and role required');
    setStatus('Saving...');
    try {
      if (form.password) {
        const newUser = await createAuthUser(form); // creates auth user + role
        logActivity({ type: 'user:create', uid: user?.uid, email: user?.email, target: newUser.uid, targetEmail: form.email, role: form.role });
      } else {
        // role update only; requires UID input or existing doc
        const match = users.find((u) => u.email === form.email);
        if (!match) return setStatus('No UID for this email; provide password to create');
        await setUserRole(match.id, form.email, form.role);
        logActivity({ type: 'user:updateRole', uid: user?.uid, email: user?.email, target: match.id, targetEmail: form.email, role: form.role });
      }
      setForm(empty);
      setStatus('Saved');
    } catch (e) {
      setStatus(e.message || 'Error saving user');
    }
  };

  return (
    <ManagerShell
      title="Users"
      description="Create accounts and update roles. Password required only for new accounts."
      onCreate={() => { setForm(empty); setStatus(''); }}
    >
      {status && <div className="text-sm text-custom-gold mb-2">{status}</div>}
      <div className="glass-card p-4 rounded-lg border border-gray-700 space-y-3">
        <input className="w-full bg-gray-800 text-white px-3 py-2 rounded"
          placeholder="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full bg-gray-800 text-white px-3 py-2 rounded"
          placeholder="Password (only for new user)" type="password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className="w-full bg-gray-800 text-white px-3 py-2 rounded"
          value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="admin">admin</option>
          <option value="user">user</option>
        </select>
        <button onClick={save} className="bg-custom-gold text-black px-4 py-2 rounded font-bold">Save</button>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        {users.map((u) => (
          <div key={u.id} className="glass-card border border-gray-800 rounded-xl p-4 flex justify-between">
            <div>
              <p className="text-white font-bold">{u.email}</p>
              <p className="text-sm text-gray-400">Role: {u.role}</p>
            </div>
          </div>
        ))}
      </div>
    </ManagerShell>
  );
};

export default UserManager;
