import React, { useEffect, useState } from 'react';
import { db, listenToCollection, createItem, updateItem, deleteItem, logActivity } from '../../firebase';
import { useAuth } from '../AuthContext';
import ManagerShell from './ManagerShell';

const empty = { name: '', price: '', description: '', image: '', category: '', stock: 0 };

const ShopManager = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!db) return;
    const unsub = listenToCollection('shop', setItems);
    return () => unsub && unsub();
  }, []);

  const save = async () => {
    if (!form.name) return setStatus('Name required');
    setStatus('Saving...');
    const payload = { ...form, price: Number(form.price) || 0, stock: Number(form.stock) || 0 };
    try {
      if (editing === 'new') {
        const ref = await createItem('shop', payload);
        logActivity({ type: 'shop:create', uid: user?.uid, email: user?.email, id: ref.id });
      } else {
        await updateItem('shop', editing, payload);
        logActivity({ type: 'shop:update', uid: user?.uid, email: user?.email, id: editing });
      }
      setEditing(null);
      setForm(empty);
      setStatus('Saved');
    } catch (e) {
      setStatus(e.message || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await deleteItem('shop', id);
    logActivity({ type: 'shop:delete', uid: user?.uid, email: user?.email, id });
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
      const res = await fetch('/api/upload.php', {
        method: 'POST',
        body: formData,
      });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (_) {}
      if (!res.ok || !data || data.error) {
        throw new Error((data && data.error) || text || 'Upload failed');
      }
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
      title="Shop"
      description="Manage products that feed the storefront."
      onCreate={() => { setEditing('new'); setForm(empty); setStatus(''); }}
    >
      {status && <div className="text-sm text-custom-gold">{status}</div>}
      {editing && (
        <div className="glass-card p-4 rounded-lg border border-gray-700 space-y-3">
          <input className="w-full bg-gray-800 text-white px-3 py-2 rounded" placeholder="Name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="w-full bg-gray-800 text-white px-3 py-2 rounded" placeholder="Price"
            value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input className="w-full bg-gray-800 text-white px-3 py-2 rounded" placeholder="Category"
            value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
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
            placeholder="Description" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="w-full bg-gray-800 text-white px-3 py-2 rounded" placeholder="Stock"
            value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <div className="flex gap-2 items-center">
            <button onClick={save} className="bg-custom-gold text-black px-4 py-2 rounded font-bold">Save</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded border border-gray-700">Cancel</button>
            {uploading && <span className="text-xs text-gray-400">Uploading...</span>}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="glass-card border border-gray-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <div>
                <h3 className="text-xl font-bold">{item.name}</h3>
                <p className="text-sm text-custom-gold">R {item.price}</p>
              </div>
              <div className="space-x-2 text-sm">
                <button onClick={() => { setEditing(item.id); setForm(item); }} className="text-custom-gold">Edit</button>
                <button onClick={() => remove(item.id)} className="text-red-400">Delete</button>
              </div>
            </div>
            <p className="text-gray-300 text-sm">{item.description}</p>
            <p className="text-xs text-gray-400">Category: {item.category} · Stock: {item.stock}</p>
          </div>
        ))}
      </div>
    </ManagerShell>
  );
};

export default ShopManager;
