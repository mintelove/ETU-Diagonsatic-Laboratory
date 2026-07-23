import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const blank = { name: '', category: '', price: 600, description: '', requiredSampleTypes: [], consumables: [] };
const palette = [['#8c1d2c', '#d95062', '🩸'], ['#075c91', '#1d9fce', '🧪'], ['#007c79', '#28aea4', '💧'], ['#26743a', '#65b96e', '🔬'], ['#633b92', '#9a70ca', '🦠'], ['#ad5d11', '#e99b39', '🧫'], ['#293d81', '#6378c2', '🏥'], ['#52616b', '#87949d', '⚕️']];

const keyFor = name => {
  const normalized = (name || '').toLowerCase();
  if (normalized.includes('hema')) return 0;
  if (normalized.includes('chem') || normalized.includes('assay')) return 1;
  if (normalized.includes('urine') || normalized.includes('fluid')) return 2;
  if (normalized.includes('paras')) return 3;
  if (normalized.includes('micro')) return 4;
  if (normalized.includes('serol')) return 5;
  if (normalized.includes('referral')) return 6;
  return 7;
};

export default function LaboratoryTestsPage() {
  const { token } = useAuth();
  const [data, setData] = useState({ categories: [], tests: [], samples: [], settings: {} });
  const [form, setForm] = useState(blank);
  const [newCategory, setNewCategory] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [message, setMessage] = useState('');
  const [editingTest, setEditingTest] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const load = () => api('/laboratory-tests/admin', { token }).then(catalog => {
    setData(catalog);
  }).catch(error => setMessage(error.message));

  useEffect(() => { load(); }, [token]);

  const selected = data.categories.find(category => category._id === selectedId);
  const categoryTests = useMemo(() => data.tests.filter(test => test.category?._id === selected?._id), [data.tests, selected]);
  const matches = useMemo(() => categoryTests.filter(test => {
    const searchable = `${test.name} ${test.description || ''} ${selected?.name || ''}`.toLowerCase();
    return (!query || searchable.includes(query.toLowerCase())) && (filter === 'All' || filter === 'Active' && test.status === 'Active' || filter === 'Referral' && /referral/i.test(selected?.name) || filter === 'Popular' || filter === 'Recently Added');
  }).sort((first, second) => {
    if (sortBy === 'price') return Number(first.price) - Number(second.price);
    if (sortBy === 'status') return first.status.localeCompare(second.status) || first.name.localeCompare(second.name);
    return first.name.localeCompare(second.name);
  }), [categoryTests, filter, query, selected, sortBy]);
  const visibleCategories = useMemo(() => data.categories.filter(category => {
    const searchable = `${category.name} ${data.tests.filter(test => test.category?._id === category._id).map(test => test.name).join(' ')}`.toLowerCase();
    return !query || searchable.includes(query.toLowerCase());
  }), [data.categories, data.tests, query]);

  const applyTestUpdate = (test, changes) => setData(current => ({
    ...current,
    tests: current.tests.map(item => item._id === test._id ? { ...item, ...changes, category: changes.category ? current.categories.find(category => category._id === changes.category) || item.category : item.category } : item)
  }));

  const chooseCategory = category => {
    if (selectedId === category._id) {
      setSelectedId('');
      return;
    }
    setSelectedId(category._id);
    setCategoryName(category.name);
    setEditingCategory(false);
    setForm(current => ({ ...current, category: category._id }));
  };

  const saveTest = async event => {
    event.preventDefault();
    try {
      await api('/laboratory-tests/tests', { token, method: 'POST', body: JSON.stringify({ ...form, category: form.category || selected?._id }) });
      setForm({ ...blank, category: selected?._id || '' });
      setMessage('Laboratory test added.');
      load();
    } catch (error) { setMessage(error.message); }
  };

  const saveSettings = async event => {
    event.preventDefault();
    try {
      await api('/laboratory-tests/settings', { token, method: 'PUT', body: JSON.stringify(data.settings) });
      setMessage('Pricing settings saved.');
    } catch (error) { setMessage(error.message); }
  };

  const updateCategory = async changes => {
    try {
      await api(`/laboratory-tests/categories/${selected._id}`, { token, method: 'PUT', body: JSON.stringify(changes) });
      setMessage('Category updated.');
      setEditingCategory(false);
      load();
    } catch (error) { setMessage(error.message); }
  };

  const removeCategory = async () => {
    if (!confirm(`Delete ${selected.name}? This is only available when it has no tests.`)) return;
    try {
      await api(`/laboratory-tests/categories/${selected._id}`, { token, method: 'DELETE' });
      setSelectedId('');
      setMessage('Category deleted.');
      load();
    } catch (error) { setMessage(error.message); }
  };

  const handleEdit = test => {
    setEditingTest(test);
    setEditForm({ name: test.name || '', price: test.price ?? 0, description: test.description || '', status: test.status || 'Active', categoryId: test.category?._id || test.category || '', consumables: (test.consumables || []).map(c => ({ item: c.item?._id || c.item, quantity: c.quantity })) });
  };

  const closeEdit = () => {
    if (!savingEdit) {
      setEditingTest(null);
      setEditForm(null);
    }
  };

  const saveEdit = async event => {
    event.preventDefault();
    if (!editingTest || !editForm) return;
    const price = Number(editForm.price);
    if (!editForm.name.trim() || !Number.isFinite(price) || price < 0) return setMessage('Enter a test name and a valid price.');
    const changes = { name: editForm.name.trim(), price, description: editForm.description, status: editForm.status, category: editForm.categoryId, consumables: editForm.consumables.filter(c=>c.item && Number(c.quantity)>0).map(c=>({item:c.item,quantity:Number(c.quantity)})) };
    setSavingEdit(true);
    try {
      await api(`/laboratory-tests/tests/${editingTest._id}`, { token, method: 'PUT', body: JSON.stringify(changes) });
      applyTestUpdate(editingTest, changes);
      setEditingTest(null);
      setEditForm(null);
      setMessage('Laboratory test updated successfully.');
    } catch (error) { setMessage(error.message); } finally { setSavingEdit(false); }
  };

  const removeTest = async test => {
    if (!confirm(`Delete ${test.name}?`)) return;
    try {
      await api(`/laboratory-tests/tests/${test._id}`, { token, method: 'DELETE' });
      setMessage('Test deleted.');
      load();
    } catch (error) { setMessage(error.message); }
  };

  return <section className="page laboratory-tests-page">
    <header className="lab-page-header"><div><p className="eyebrow">Laboratory configuration</p><h1>Laboratory Test Types</h1><p>Organize your diagnostic catalogue in one clear, clinical workspace.</p></div><label className="lab-search"><span aria-hidden="true">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search test name or main category" aria-label="Search laboratory tests" /></label></header>
    {message && <div className="alert success" role="status">{message}</div>}
    <section className="lab-catalogue-stats" aria-label="Laboratory test catalogue statistics"><article><span>Total categories</span><strong>{data.categories.length}</strong><i>▦</i></article><article><span>Total laboratory tests</span><strong>{data.tests.length}</strong><i>🧪</i></article><article><span>Active tests</span><strong>{data.tests.filter(test => test.status === 'Active').length}</strong><i>✓</i></article><article><span>Inactive tests</span><strong>{data.tests.filter(test => test.status === 'Inactive').length}</strong><i>◌</i></article></section>
    <div className="lab-filter-bar" role="toolbar" aria-label="Test filters">{['All', 'Popular', 'Recently Added', 'Referral', 'Active'].map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
    <div className="lab-admin-layout">
      <aside className="lab-category-rail"><div className="lab-section-title"><div><span>Catalogue</span><h2>Main laboratory categories</h2></div><b>{visibleCategories.length}</b></div><div className="lab-category-grid">{visibleCategories.map(category => {
        const count = data.tests.filter(test => test.category?._id === category._id).length;
        const active = data.tests.filter(test => test.category?._id === category._id && test.status === 'Active').length;
        const [from, to, icon] = palette[keyFor(category.name)];
        return <button key={category._id} className={`lab-category-card ${selected?._id === category._id ? 'selected' : ''}`} style={{ '--lab-from': from, '--lab-to': to }} onClick={() => chooseCategory(category)}><span className="lab-category-icon">{icon}</span><span className="lab-category-copy"><small>{category.status}</small><strong>{category.name}</strong><em>{count} tests · {active} active</em></span><span className="lab-chevron">›</span></button>;
      })}</div>{selected && <form className="lab-new-category" onSubmit={async event => { event.preventDefault(); try { await api('/laboratory-tests/categories', { token, method: 'POST', body: JSON.stringify({ name: newCategory, displayOrder: data.categories.length }) }); setNewCategory(''); setMessage('Category added.'); load(); } catch (error) { setMessage(error.message); } }}><input required value={newCategory} onChange={event => setNewCategory(event.target.value)} placeholder="New category name" /><button className="primary" aria-label="Add category">＋</button></form>}</aside>
      <main className="lab-detail-panel">{selected ? <>
        <section className="lab-detail-hero" style={{ '--lab-from': palette[keyFor(selected.name)][0], '--lab-to': palette[keyFor(selected.name)][1] }}><span className="lab-detail-icon">{palette[keyFor(selected.name)][2]}</span><div>{editingCategory ? <input autoFocus value={categoryName} onChange={event => setCategoryName(event.target.value)} aria-label="Category name" /> : <><p>Selected category</p><h2>{selected.name}</h2></>}<span>{categoryTests.length} tests · {categoryTests.filter(test => test.status === 'Active').length} active</span></div><div className="lab-hero-actions">{editingCategory ? <button className="lab-icon-button" onClick={() => updateCategory({ name: categoryName })}>Save</button> : <button className="lab-icon-button" onClick={() => { setCategoryName(selected.name); setEditingCategory(true); }}>Edit category</button>}<button className="lab-icon-button" onClick={() => updateCategory({ hidden: !selected.hidden })}>{selected.hidden ? 'Show' : 'Hide'}</button><button className="lab-icon-button danger" onClick={removeCategory}>Delete</button></div></section>
        <section className="lab-test-toolbar"><div><h2>Tests in this category</h2><p>Update pricing or availability directly, then save without leaving the list.</p></div><div className="lab-toolbar-actions"><label className="lab-sort">Sort by<select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="name">Test name</option><option value="price">Price</option><option value="status">Status</option></select></label><button className="primary" onClick={() => document.getElementById('new-lab-test')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>＋ Add test</button></div></section>
        <div className="lab-test-table" role="region" aria-label="Laboratory tests"><div className="lab-test-head"><span>Laboratory test</span><span>Price</span><span>Details</span><span>Status</span><span>Actions</span></div>{matches.map(test => <article className="lab-test-row" key={test._id}><div className="lab-test-name"><i>🧪</i><span><label className="sr-only" htmlFor={`test-name-${test._id}`}>Test name</label><input id={`test-name-${test._id}`} value={test.name} readOnly disabled /><label className="sr-only" htmlFor={`test-description-${test._id}`}>Description</label><input id={`test-description-${test._id}`} value={test.description || 'Routine laboratory investigation'} readOnly disabled /></span></div><div className="lab-inline-price"><label><span className="sr-only">Price for {test.name}</span><input type="number" value={test.price} readOnly disabled /></label><b>ETB</b></div><span className="lab-specimen">{test.requiredSampleTypes?.map(sample => sample.name).join(', ') || 'Not mapped'}</span><label className={`lab-status-select ${test.status === 'Active' ? 'active' : ''}`}><span className="sr-only">Status for {test.name}</span><select value={test.status} disabled readOnly><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label><div className="lab-row-actions"><button onClick={() => handleEdit(test)} aria-label={`Edit ${test.name}`}>Edit</button><button className="danger" onClick={() => removeTest(test)}>Delete</button></div></article>)}{!matches.length && <div className="lab-empty"><span>🧪</span><h3>No Laboratory Tests Available</h3><p>There are no tests matching this view.</p><button className="primary" onClick={() => document.getElementById('new-lab-test')?.scrollIntoView({ behavior: 'smooth' })}>Add First Test</button></div>}</div>
        <section id="new-lab-test" className="lab-management-forms"><form className="lab-form-card" onSubmit={saveTest}><div><p className="eyebrow">Catalogue entry</p><h2>Add laboratory test</h2></div><div className="form-grid"><label>Test name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label>Category<select value={form.category || selected._id} onChange={event => setForm({ ...form, category: event.target.value })}>{data.categories.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label>Price (ETB)<input type="number" min="0" value={form.price} onChange={event => setForm({ ...form, price: +event.target.value })} /></label><label>Required specimen<select multiple value={form.requiredSampleTypes} onChange={event => setForm({ ...form, requiredSampleTypes: [...event.target.selectedOptions].map(option => option.value) })}>{data.samples.map(sample => <option key={sample._id} value={sample._id}>{sample.name}</option>)}</select></label><label className="wide">Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label></div><button className="primary">Add Test</button></form><form className="lab-form-card lab-settings-card" onSubmit={saveSettings}><div><p className="eyebrow">Billing settings</p><h2>Discount & counseling</h2></div><div className="form-grid"><label>Staff discount %<input type="number" min="0" max="100" value={data.settings.staffDiscount ?? 20} onChange={event => setData({ ...data, settings: { ...data.settings, staffDiscount: +event.target.value } })} /></label><label>Collaborator discount %<input type="number" min="0" max="100" value={data.settings.collaboratorDiscount ?? 20} onChange={event => setData({ ...data, settings: { ...data.settings, collaboratorDiscount: +event.target.value } })} /></label><label>Counseling fee<select value={data.settings.counselingStatus || 'Free'} onChange={event => setData({ ...data, settings: { ...data.settings, counselingStatus: event.target.value } })}><option>Free</option><option>Paid</option></select></label><label>Counseling price (ETB)<input type="number" min="0" value={data.settings.counselingPrice ?? 0} onChange={event => setData({ ...data, settings: { ...data.settings, counselingPrice: +event.target.value } })} /></label></div><button className="primary">Save Settings</button></form></section>
      </> : <div className="lab-empty"><h2>Select a category</h2></div>}</main>
    </div>
    {editingTest && editForm && <div className="lab-drawer-backdrop" role="presentation" onClick={closeEdit}><form className="lab-edit-drawer" aria-label="Edit laboratory test" onClick={event => event.stopPropagation()} onSubmit={saveEdit}><header><div><p className="eyebrow">Laboratory catalogue</p><h2>Edit laboratory test</h2><span>Update the complete test definition.</span></div><button type="button" className="modal-close" aria-label="Close edit drawer" disabled={savingEdit} onClick={closeEdit}>×</button></header><div className="lab-drawer-body"><label>Test Name<input required value={editForm.name} onChange={event => setEditForm({ ...editForm, name: event.target.value })} /></label><label>Price (ETB)<input required type="number" min="0" step="0.01" value={editForm.price} onChange={event => setEditForm({ ...editForm, price: event.target.value })} /></label><label>Main Category<select value={editForm.categoryId} onChange={event => setEditForm({ ...editForm, categoryId: event.target.value })}>{data.categories.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label>Status<select value={editForm.status} onChange={event => setEditForm({ ...editForm, status: event.target.value })}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label><label>Description<textarea value={editForm.description} onChange={event => setEditForm({ ...editForm, description: event.target.value })} /></label><div className="wide"><strong>Default consumables</strong>{editForm.consumables.map((c,i)=><div className="form-grid" key={i}><select value={c.item} onChange={e=>setEditForm({...editForm,consumables:editForm.consumables.map((x,n)=>n===i?{...x,item:e.target.value}:x)})}><option value="">Choose stock item</option>{data.stockItems.map(item=><option key={item._id} value={item._id}>{item.itemName}</option>)}</select><input type="number" min="1" value={c.quantity} onChange={e=>setEditForm({...editForm,consumables:editForm.consumables.map((x,n)=>n===i?{...x,quantity:e.target.value}:x)})}/><button type="button" onClick={()=>setEditForm({...editForm,consumables:editForm.consumables.filter((_,n)=>n!==i)})}>Remove</button></div>)}<button type="button" onClick={()=>setEditForm({...editForm,consumables:[...editForm.consumables,{item:'',quantity:1}]})}>+ Add consumable</button></div></div><footer><button type="button" disabled={savingEdit} onClick={closeEdit}>Cancel</button><button className="primary" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save changes'}</button></footer></form></div>}
  </section>;
}
