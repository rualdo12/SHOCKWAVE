import React, { useEffect, useRef, useState } from 'react';
import { db, listenToCollection, createItem, updateItem, deleteItem, logActivity } from '../../firebase';
import { useAuth } from '../AuthContext';
import ManagerShell from './ManagerShell';

const empty = { title: '', excerpt: '', body: '', category: '', image: '' };

// Simple, dependency-free rich text editor using contentEditable and execCommand
const RichTextEditor = ({ label, value, onChange, placeholder, minHeight = '120px' }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const applyCmd = (cmd, arg = null) => {
    if (!ref.current) return;
    ref.current.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current.innerHTML);
  };

  const onInput = (e) => onChange(e.currentTarget.innerHTML);

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-200 flex flex-wrap gap-2">
        <button type="button" className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600" onClick={() => applyCmd('bold')}>
          Bold
        </button>
        <button type="button" className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600" onClick={() => applyCmd('italic')}>
          Italic
        </button>
        <button type="button" className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600" onClick={() => applyCmd('underline')}>
          Underline
        </button>
        <button type="button" className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600" onClick={() => applyCmd('formatBlock', 'h3')}>
          H3
        </button>
        <button type="button" className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600" onClick={() => applyCmd('formatBlock', 'h4')}>
          H4
        </button>
        <button type="button" className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600" onClick={() => applyCmd('insertUnorderedList')}>
          Bullets
        </button>
        <button type="button" className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600" onClick={() => applyCmd('insertOrderedList')}>
          Numbered
        </button>
        <button type="button" className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600" onClick={() => applyCmd('formatBlock', 'blockquote')}>
          Quote
        </button>
        <button
          type="button"
          className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
          onClick={() => applyCmd('removeFormat')}
        >
          Clear
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-custom-yellow/60 focus:border-custom-yellow/40 leading-relaxed rich-text-area"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />
      {label && <p className="text-xs text-gray-400">{label}</p>}
    </div>
  );
};

const BlogManager = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // id or 'new'
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!db) return;
    const unsub = listenToCollection('blog', setItems);
    return () => unsub && unsub();
  }, []);

  const startCreate = () => {
    setEditing('new');
    setForm(empty);
    setStatus('');
  };

  const startEdit = (item) => {
    setEditing(item.id);
    setForm(item);
    setStatus('');
  };

  const save = async () => {
    if (!form.title) {
      setStatus('Title required');
      return;
    }
    setStatus('Saving...');
    try {
      if (editing === 'new') {
        const ref = await createItem('blog', form);
        logActivity({ type: 'blog:create', uid: user?.uid, email: user?.email, id: ref.id });
      } else {
        await updateItem('blog', editing, form);
        logActivity({ type: 'blog:update', uid: user?.uid, email: user?.email, id: editing });
      }
      setEditing(null);
      setForm(empty);
      setStatus('Saved');
    } catch (e) {
      setStatus(e.message || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this blog post?')) return;
    await deleteItem('blog', id);
    logActivity({ type: 'blog:delete', uid: user?.uid, email: user?.email, id });
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
      title="Blog"
      description="Create, edit, and delete blog posts. Updates are live."
      onCreate={startCreate}
    >
      {status && <div className="text-sm text-custom-yellow">{status}</div>}

      {editing && (
        <div className="glass-card p-4 rounded-lg border border-gray-700 space-y-3">
          <input
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
            placeholder="Image URL"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="text-sm"
            />
            <span className="text-gray-500">Max 4MB</span>
          </div>
          <RichTextEditor
            placeholder="Excerpt (can include basic formatting)"
            value={form.excerpt}
            onChange={(val) => setForm({ ...form, excerpt: val })}
            minHeight="100px"
            label="Tip: keep this short — it shows in the card list."
          />
          <RichTextEditor
            placeholder="Body content (supports bold, italics, headings, lists)"
            value={form.body}
            onChange={(val) => setForm({ ...form, body: val })}
            minHeight="180px"
            label="Use the toolbar for headings, bullets, and emphasis."
          />
          <div className="flex gap-2">
            <button onClick={save} className="bg-custom-yellow text-black px-4 py-2 rounded font-bold">
              Save
            </button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded border border-gray-700">
              Cancel
            </button>
            {uploading && <span className="text-xs text-gray-400">Uploading...</span>}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="glass-card border border-gray-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-xs text-gray-400">{item.category}</p>
              </div>
              <div className="space-x-2 text-sm">
                <button onClick={() => startEdit(item)} className="text-custom-yellow">Edit</button>
                <button onClick={() => remove(item.id)} className="text-red-400">Delete</button>
              </div>
            </div>
            <p className="text-gray-300 text-sm">{item.excerpt}</p>
          </div>
        ))}
      </div>
    </ManagerShell>
  );
};

export default BlogManager;
