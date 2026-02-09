import React, { useEffect, useState } from 'react';
import { db, listenToCollection, createItem, updateItem, deleteItem, logActivity } from '../../firebase';
import { useAuth } from '../AuthContext';
import ManagerShell from './ManagerShell';

const empty = { name: '', summary: '', details: '', price: '', image: '' };

const ServicesManager = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!db) return;
    const unsub = listenToCollection('services', setItems);
    return () => unsub && unsub();
  }, []);

  const save = async () => {
    if (!form.name) return setStatus('Name required');
    setStatus('Saving...');
    try {
      if (editing === 'new') {
        const ref = await createItem('services', form);
        logActivity({ type: 'services:create', uid: user?.uid, email: user?.email, id: ref.id });
      } else {
        await updateItem('services', editing, form);
        logActivity({ type: 'services:update', uid: user?.uid, email: user?.email, id: editing });
      }
      setEditing(null);
      setForm(empty);
      setStatus('Saved');
    } catch (e) {
      setStatus(e.message || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    await deleteItem('services', id);
    logActivity({ type: 'services:delete', uid: user?.uid, email: user?.email, id });
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setStatus('Image too large (max 4MB).');
      return;
    }
    setUploading(true);
    setStatus('Uploading image...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload.php', { method: 'POST', body: formData });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (_) {}
      if (!res.ok || !data || data.error) throw new Error((data && data.error) || text || 'Upload failed');
      setForm((prev) => ({ ...prev, image: data.url }));
      setStatus('Image uploaded.');
    } catch (e) {
      setStatus(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ManagerShell
      title="Services"
      description="Manage services that feed the Services page/cards."
      onCreate={() => { setEditing('new'); setForm(empty); setStatus(''); }}
    >
      {status && <div className="text-sm text-custom-yellow">{status}</div>}
      {editing && (
        <div className="glass-card p-4 rounded-lg border border-gray-700 space-y-3">
          <input className="w-full bg-gray-800 text-white px-3 py-2 rounded" placeholder="Name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="w-full bg-gray-800 text-white px-3 py-2 rounded" placeholder="Price / Label"
            value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input className="w-full bg-gray-800 text-white px-3 py-2 rounded" placeholder="Image URL"
            value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="text-sm"
            />
            <span className="text-gray-500">Max 4MB</span>
          </div>
          <textarea className="w-full bg-gray-800 text-white px-3 py-2 rounded"
            placeholder="Summary" value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <textarea className="w-full bg-gray-800 text-white px-3 py-2 rounded min-h-[120px]"
            placeholder="Details" value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={save} className="bg-custom-yellow text-black px-4 py-2 rounded font-bold">Save</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded border border-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="glass-card border border-gray-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <h3 className="text-xl font-bold">{item.name}</h3>
              <div className="space-x-2 text-sm">
                <button onClick={() => { setEditing(item.id); setForm(item); }} className="text-custom-yellow">Edit</button>
                <button onClick={() => remove(item.id)} className="text-red-400">Delete</button>
              </div>
            </div>
            <p className="text-gray-300 text-sm">{item.summary}</p>
            <p className="text-xs text-gray-400">{item.price}</p>
          </div>
        ))}
      </div>
    </ManagerShell>
  );
};

export default ServicesManager;
