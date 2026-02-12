
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Collections from './pages/Collections';
import AllotmentPage from './pages/AllotmentPage';
import Reports from './pages/Reports';
import MemberPortal from './pages/MemberPortal';
import AdminWrapper from './components/AdminWrapper';
import { User, UserRole, Member, ChitStatus } from './types';
import { db } from './db';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{ name: string; content: string } | null>(null);
  const [, setTick] = useState(0); 
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const [bulkCsvText, setBulkCsvText] = useState('');
  const [masterView, setMasterView] = useState<'list' | 'createChit' | 'createMember' | 'bulkMember' | 'editMember' | 'editChit'>('list');

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editingChit, setEditingChit] = useState<any>(null);
  
  const [securityLockPrompt, setSecurityLockPrompt] = useState<{ type: string; data: any } | null>(null);
  const [securityPassword, setSecurityPassword] = useState('');

  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    db.setDirtyListener((dirty) => {
      setIsDirty(dirty);
      forceUpdate();
    });
    db.setSyncListener((syncing) => {
      setIsSyncing(syncing);
      forceUpdate();
    });
    
    setIsDirty(db.getDirtyStatus());
    setIsSyncing(db.getSyncStatus());

    const initSync = async () => {
      await db.loadCloudData();
      forceUpdate(); 
    };
    initSync();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    if (window.matchMedia('(display-mode: standalone)').matches) setShowInstallBanner(false);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [forceUpdate]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const { username, password } = loginForm;

    if (password === 'xdr5tgb' && (username.toLowerCase() === 'admin' || !username)) {
      const admin = db.getUsers().find(u => u.username === 'admin');
      if (admin) {
        setUser(admin);
        setLoginError('');
        setActivePage('dashboard');
        return;
      }
    }

    const members = db.getMembers();
    const matchedMember = members.find(m => m.memberId === username);
    if (matchedMember) {
      const last4Digits = matchedMember.mobile.replace(/\D/g, '').slice(-4);
      if (password === last4Digits) {
        setUser({
          userId: matchedMember.memberId,
          name: matchedMember.name,
          role: UserRole.MEMBER,
          username: matchedMember.memberId,
          passwordHash: '',
          isActive: true,
          memberId: matchedMember.memberId
        });
        setLoginError('');
        setActivePage('my_portal');
        return;
      }
    }

    setLoginError('Invalid Credentials. Access denied.');
  };

  const handleLogout = () => {
    setUser(null);
    setActivePage('dashboard');
  };

  const handleSync = async () => {
    const cloudSuccess = await db.save();
    if (cloudSuccess) alert('Done: Sync Completed');
    else if (!navigator.onLine) alert('Cloud sync unavailable, working offline.');
    else alert('Note: Local save successful. Cloud sync unavailable.');
  };

  const handleBackup = () => {
    const data = db.getSerializedData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    link.href = url;
    link.download = `Bhadrakali_Chits_Backup_${dateStr}_${timeStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/json' && !file.name.endsWith('.json') && !file.name.endsWith('.db')) {
      alert("Please upload a valid JSON backup file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        JSON.parse(content); // Test if valid JSON
        setPendingRestore({ name: file.name, content });
      } catch (e) {
        alert("Invalid backup file: Not a valid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Fix: Added missing handleBulkFileSelect to handle CSV file reading
  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBulkCsvText(content);
    };
    reader.readAsText(file);
  };

  const executeRestore = async () => {
    if (!pendingRestore) return;
    const confirmRestore = window.confirm(`DANGER: This will permanently OVERWRITE all current data with the contents of "${pendingRestore.name}". This action cannot be undone. Are you sure you want to proceed?`);
    if (!confirmRestore) {
      setPendingRestore(null);
      return;
    }
    setIsRestoring(true);
    await new Promise(r => setTimeout(r, 1500)); // Dramatic pause for safety
    const success = db.restore(pendingRestore.content);
    setIsRestoring(false);
    if (success) {
      alert('Success: Database restored! The app will now reload.');
      window.location.reload();
    }
    else {
      alert("Restore failed: The file content was invalid or corrupted.");
      setPendingRestore(null);
    }
  };

  const getGroupCapacityStatus = (groupId: string) => {
    const chit = db.getChits().find(c => c.chitGroupId === groupId);
    if (!chit) return null;
    const currentCount = db.getMemberships().filter(m => m.chitGroupId === groupId).length;
    return { current: currentCount, max: chit.maxMembers || 0, isFull: currentCount >= (chit.maxMembers || 0) };
  };

  const verifySecurityPassword = () => {
    if (securityPassword === 'xdr5tgb') {
      const { type, data } = securityLockPrompt!;
      if (type === 'editMember') {
        setEditingMember(data.member);
        setSelectedGroupId(data.groupId);
        setMasterView('editMember');
      } else if (type === 'editChit') {
        setEditingChit(data.chit);
        setMasterView('editChit');
      }
      setSecurityLockPrompt(null);
      setSecurityPassword('');
    } else {
      alert('Incorrect Password.');
    }
  };

  const parseCSVLine = (text: string) => {
    const re = /(?!\s*$)\s*(?:'([^']*)'|"([^"]*)"|([^,]*))\s*(?:,|$)/g;
    const res = [];
    let match;
    while ((match = re.exec(text)) !== null) {
      res.push(match[1] || match[2] || match[3] || "");
    }
    if (text.endsWith(',')) res.push("");
    return res;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-sm ms-bg-card p-8 rounded-lg ms-shadow border ms-border text-gray-900 mb-6">
          <div className="text-center mb-8">
            <div className="text-4xl font-black text-blue-600 tracking-tighter mb-4 leading-tight uppercase">Bhadrakali<br/>Chits</div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Welcome to Bhadrakali Chits</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">User ID / Member ID</label>
              <input 
                className="w-full border p-2 rounded" 
                type="text" 
                required 
                placeholder="Enter Username or ID"
                value={loginForm.username} 
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Password</label>
              <input 
                className="w-full border p-2 rounded" 
                type="password" 
                required 
                placeholder="Enter password"
                value={loginForm.password} 
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} 
              />
              <p className="text-[10px] text-gray-400 mt-1">Members: Last 4 digits of Mobile</p>
            </div>
            {loginError && <p className="text-red-500 text-xs text-center font-semibold">{loginError}</p>}
            <button type="submit" className="w-full ms-bg-primary text-white py-3 rounded-lg font-bold shadow-md active:scale-95 transform">Sign In</button>
          </form>
        </div>
        <div className="text-gray-400 text-xs text-center font-medium">Powered by Guntupally Technology Services</div>
      </div>
    );
  }

  const renderMasters = () => (
    <AdminWrapper title="Masters">
      {masterView === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in">
          <div className="ms-bg-card p-4 md:p-6 rounded border ms-border ms-shadow">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Groups</h3>
              <button onClick={() => setMasterView('createChit')} className="text-xs font-bold ms-primary hover:underline">Create New</button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {db.getChits().map(c => {
                const cap = getGroupCapacityStatus(c.chitGroupId);
                return (
                  <div key={c.chitGroupId} className="p-3 border ms-border rounded flex justify-between items-center text-sm bg-white group">
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-[10px] text-gray-400">₹{c.chitValue.toLocaleString()} • {cap?.current}/{cap?.max} Filled</div>
                    </div>
                    <button onClick={() => setSecurityLockPrompt({ type: 'editChit', data: { chit: c } })} className="p-2 text-gray-400 hover:text-blue-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="ms-bg-card p-4 md:p-6 rounded border ms-border ms-shadow">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Members</h3>
              <div className="flex gap-4">
                <button onClick={() => setMasterView('bulkMember')} className="text-xs font-bold text-green-600 hover:underline">Bulk</button>
                <button onClick={() => setMasterView('createMember')} className="text-xs font-bold ms-primary hover:underline">Add</button>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {db.getMembers().map(m => (
                <div key={m.memberId} className="p-3 border ms-border rounded flex justify-between items-center text-sm bg-white group">
                  <div><div className="font-semibold">{m.name}</div><div className="text-[10px] text-gray-400">{m.mobile} • {m.memberId}</div></div>
                  <button onClick={() => setSecurityLockPrompt({ type: 'editMember', data: { member: m, groupId: db.getMemberships().find(ms => ms.memberId === m.memberId)?.chitGroupId || '' } })} className="p-2 text-gray-400 hover:text-blue-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Database Backup & Restore Section at the bottom of list view */}
          <div className="md:col-span-2 mt-2">
            <div className="ms-bg-card p-5 md:p-6 rounded-lg border ms-border ms-shadow bg-gray-50/30">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zM4 7c0-1 1-2 2-2h12c1 0 2 1 2 2M12 11v4m-2-2l2 2 2-2"/></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800">Local Maintenance & Backup</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={handleBackup} 
                  className="group relative px-6 py-5 bg-white border ms-border rounded-xl flex items-center justify-between hover:border-blue-400 hover:shadow-md transition-all text-left"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-black text-gray-900">Download Local Backup</span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Save database to a .json file</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  </div>
                </button>
                
                <div className="relative group">
                  <label className="px-6 py-5 bg-white border ms-border rounded-xl flex items-center justify-between cursor-pointer hover:border-green-400 hover:shadow-md transition-all text-left">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-black text-gray-900">Restore from Local File</span>
                      <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">
                        {pendingRestore ? `Selected: ${pendingRestore.name}` : 'Upload a .json backup file'}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-green-50 flex items-center justify-center text-gray-400 group-hover:text-green-600 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"/></svg>
                    </div>
                    <input type="file" className="hidden" accept=".json,.db" onChange={handleFileSelect} />
                  </label>
                  {pendingRestore && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl border-2 border-green-500 p-2 flex items-center gap-2 animate-in zoom-in-95 duration-200">
                      <div className="flex-1 flex flex-col justify-center px-2">
                         <p className="text-[10px] font-black text-green-700 uppercase leading-tight mb-0.5">Confirm Restore?</p>
                         <p className="text-[9px] text-gray-500 truncate font-medium">{pendingRestore.name}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setPendingRestore(null)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] font-bold uppercase transition-colors">Cancel</button>
                        <button onClick={executeRestore} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold uppercase shadow-sm transition-colors">Confirm</button>
                      </div>
                    </div>
                  )}
                  {isRestoring && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-green-600 border-t-transparent animate-spin rounded-full"></div>
                        <span className="text-[10px] font-black uppercase text-green-700">Restoring Data...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
                 <div className="shrink-0 text-amber-600">
                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                 </div>
                 <p className="text-[10px] text-amber-800 font-medium">Restoring a backup will overwrite everything. Always download a fresh backup before performing a restore for safety.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <button onClick={() => { setMasterView('list'); setEditingMember(null); setEditingChit(null); setPendingRestore(null); }} className="mb-4 text-sm text-blue-600 font-bold px-4 md:px-0">&larr; Back to List</button>
          
          {masterView === 'bulkMember' && (
             <div className="ms-bg-card p-6 md:p-8 rounded border ms-border ms-shadow animate-in mx-2 md:mx-0">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
                <h3 className="text-xl font-bold">Bulk Import Members</h3>
                <a 
                  href="data:text/csv;charset=utf-8,Name,Mobile,Address,ID Type,ID Number%0AJohn Doe,9999999999,Sample Address,Aadhar,123456789012" 
                  download="member_import_template.csv"
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download Sample Format
                </a>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const target = e.target as any;
                const groupId = target.bgroup.value;
                if (!groupId) return alert('Select Target Group');

                const cap = getGroupCapacityStatus(groupId);
                if (cap?.isFull) return alert(`Restriction: Group is full (${cap.current}/${cap.max}).`);

                const csvValue = bulkCsvText || target.csv.value || "";
                const lines = csvValue.split(/\r?\n/).filter(l => l.trim().length > 0);
                if (lines.length === 0) return alert('Enter CSV data or upload file.');

                const firstLine = lines[0] || "";
                const isHeader = (firstLine.toLowerCase().includes('name') || firstLine.toLowerCase().includes('mobile'));
                const startIndex = isHeader ? 1 : 0;
                
                const now = Date.now();
                const imports = lines.slice(startIndex).map((line, i) => {
                  const p = parseCSVLine(line);
                  return {
                    member: { 
                      memberId: `m_bulk_${now}_${i}`, 
                      name: (p[0] || "Unnamed").trim(), 
                      mobile: ((p[1] || "").replace(/\D/g, '')).slice(-10), 
                      address: (p[2] || "").trim(), 
                      idProofType: (p[3] || "Aadhar").trim(), 
                      idProofNumber: (p[4] || "").trim(), 
                      isActive: true 
                    } as Member,
                    chitGroupId: groupId
                  };
                }).filter(imp => imp.member.name.length > 1);

                if (imports.length === 0) return alert('No valid member records found in CSV.');

                const remaining = (cap?.max || 0) - (cap?.current || 0);
                if (imports.length > remaining) {
                  if (!window.confirm(`Notice: Only ${remaining} slots available. Only first ${remaining} records will be imported. Proceed?`)) return;
                }

                db.bulkAddMembers(imports);
                setMasterView('list');
                setBulkCsvText('');
                forceUpdate();
                alert(`Successfully imported members.`);
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Target Group</label>
                  <select name="bgroup" required className="w-full border p-2 rounded bg-white">
                    <option value="">-- Choose Group --</option>
                    {db.getChits().map(c => <option key={c.chitGroupId} value={c.chitGroupId}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Select CSV File</label>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleBulkFileSelect} 
                    className="w-full border p-2 rounded bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Or Paste CSV Content (Name, Mobile, Address...)</label>
                  <textarea 
                    name="csv" 
                    rows={6} 
                    className="w-full border rounded font-mono text-sm p-3 bg-white" 
                    placeholder="Name, Mobile, Address, ID Type, ID Number"
                    value={bulkCsvText}
                    onChange={(e) => setBulkCsvText(e.target.value)}
                  ></textarea>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => {setMasterView('list'); setBulkCsvText('');}} className="px-6 py-2.5 border rounded bg-white text-sm font-semibold">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 ms-bg-primary text-white rounded font-bold shadow-md text-sm">Import Now</button>
                </div>
              </form>
            </div>
          )}

          {(masterView === 'createMember' || masterView === 'editMember') && (
            <div className="ms-bg-card p-6 md:p-8 rounded border ms-border ms-shadow animate-in mx-2 md:mx-0">
              <h3 className="text-xl font-bold mb-6">{masterView === 'editMember' ? 'Edit Member' : 'Add New Member'}</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const t = e.target as any;
                const groupId = t.mgroup.value;
                if (!groupId) return alert('Select Group');
                
                const cap = getGroupCapacityStatus(groupId);
                const isChangingGroup = editingMember && db.getMemberships().find(ms => ms.memberId === editingMember.memberId)?.chitGroupId !== groupId;
                if (cap?.isFull && (!editingMember || isChangingGroup)) {
                  return alert(`Restriction: Group is full.`);
                }

                const memberData = { name: t.mname.value, mobile: t.mmobile.value.replace(/\D/g, '').slice(-10), address: t.maddr.value, idProofType: t.midtype.value, idProofNumber: t.midnum.value, isActive: true };
                
                if (masterView === 'editMember' && editingMember) {
                  db.updateMember(editingMember.memberId, memberData, groupId);
                } else {
                  const id = `m_${Date.now()}`;
                  db.addMember({ ...memberData, memberId: id });
                  db.addMembership({ groupMembershipId: `gm_${Date.now()}`, chitGroupId: groupId, memberId: id, tokenNo: db.getMemberships().filter(m => m.chitGroupId === groupId).length + 1, joinedOn: new Date().toISOString().split('T')[0] });
                }
                setMasterView('list');
                forceUpdate();
              }}>
                <div className="space-y-4">
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Name</label><input className="w-full border p-2 rounded" required name="mname" defaultValue={editingMember?.name || ''} /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Mobile</label><input className="w-full border p-2 rounded" required name="mmobile" defaultValue={editingMember?.mobile || ''} maxLength={10} /></div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Group</label>
                      <select className="w-full border p-2 rounded bg-white" required name="mgroup" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
                        <option value="">-- Select --</option>
                        {db.getChits().map(c => <option key={c.chitGroupId} value={c.chitGroupId}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Address</label><textarea required name="maddr" className="bg-white border w-full p-2 rounded h-20" defaultValue={editingMember?.address || ''} /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">ID Type</label><select className="w-full border p-2 rounded bg-white" name="midtype" defaultValue={editingMember?.idProofType || 'Aadhar'}><option>Aadhar</option><option>PAN</option></select></div>
                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">ID Number</label><input className="w-full border p-2 rounded" required name="midnum" defaultValue={editingMember?.idProofNumber || ''} /></div>
                  </div>
                  <button type="submit" className="w-full py-3.5 ms-bg-primary text-white rounded font-bold shadow-md mt-4 text-sm">Save Member</button>
                </div>
              </form>
            </div>
          )}

          {(masterView === 'createChit' || masterView === 'editChit') && (
            <div className="ms-bg-card p-6 md:p-8 rounded border ms-border ms-shadow animate-in mx-2 md:mx-0">
              <h3 className="text-xl font-bold mb-6">{masterView === 'editChit' ? 'Edit Group' : 'New Group'}</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const t = e.target as any;
                const chitData = { 
                  name: t.cname.value, 
                  chitValue: Number(t.cval.value), 
                  totalMonths: Number(t.ctot.value), 
                  maxMembers: Number(t.cmax.value), 
                  monthlyInstallmentRegular: Number(t.creg.value), 
                  monthlyInstallmentAllotted: Number(t.call.value), 
                  startMonth: t.cstart.value, 
                  upiId: t.cupi.value,
                  whatsappGroupLink: t.clink.value
                };
                if (editingChit) db.updateChit(editingChit.chitGroupId, chitData);
                else db.addChit({ ...chitData, chitGroupId: `c_${Date.now()}`, status: ChitStatus.ACTIVE });
                setMasterView('list');
                forceUpdate();
              }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2"><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Group Name</label><input className="w-full border p-2 rounded" required name="cname" defaultValue={editingChit?.name || ''} /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Value (₹)</label><input className="w-full border p-2 rounded" required name="cval" type="number" defaultValue={editingChit?.chitValue || 100000} /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Max Members</label><input className="w-full border p-2 rounded" required name="cmax" type="number" defaultValue={editingChit?.maxMembers || 20} /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Regular Installment</label><input className="w-full border p-2 rounded" required name="creg" type="number" defaultValue={editingChit?.monthlyInstallmentRegular || 5000} /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Allotted Installment</label><input className="w-full border p-2 rounded" required name="call" type="number" defaultValue={editingChit?.monthlyInstallmentAllotted || 6000} /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Start Date</label><input className="w-full border p-2 rounded" type="date" required name="cstart" defaultValue={editingChit?.startMonth || ''} /></div>
                  <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">UPI ID</label><input className="w-full border p-2 rounded" required name="cupi" defaultValue={editingChit?.upiId || ''} /></div>
                  <div className="sm:col-span-2"><label className="block text-xs font-bold text-gray-400 uppercase mb-1">WhatsApp Group Link</label><input className="w-full border p-2 rounded" name="clink" placeholder="https://chat.whatsapp.com/..." defaultValue={editingChit?.whatsappGroupLink || ''} /></div>
                  <div className="sm:col-span-2"><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tenure (Months)</label><input className="w-full border p-2 rounded" type="number" required name="ctot" defaultValue={editingChit?.totalMonths || 20} /></div>
                  <button type="submit" className="sm:col-span-2 py-3.5 ms-bg-primary text-white rounded font-bold shadow-md mt-4 text-sm">Save Group</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {securityLockPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="ms-bg-card p-6 rounded-xl w-full max-w-sm ms-shadow border ms-border animate-in">
             <h4 className="text-lg font-bold mb-4">Master Verification</h4>
             <p className="text-xs text-gray-500 mb-4">Enter master password to edit records.</p>
             <input type="password" placeholder="Password" className="w-full border p-3 mb-4 rounded bg-white text-sm" value={securityPassword} onChange={(e) => setSecurityPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verifySecurityPassword()} />
             <div className="flex gap-2">
                <button onClick={() => {setSecurityLockPrompt(null); setSecurityPassword('');}} className="flex-1 py-3 text-xs font-bold border rounded bg-white">Cancel</button>
                <button onClick={verifySecurityPassword} className="flex-1 py-3 text-xs font-bold ms-bg-primary text-white rounded">Verify</button>
             </div>
          </div>
        </div>
      )}
    </AdminWrapper>
  );

  const syncLabel = isSyncing ? 'Syncing...' : (isDirty ? 'Sync Needed' : 'Sync Completed');
  const syncColor = isSyncing ? 'bg-yellow-500 text-white' : (isDirty ? 'bg-orange-500 text-white shadow-sm' : 'bg-green-600 text-white shadow-sm');

  return (
    <Layout activePage={activePage} setActivePage={(p) => setActivePage(p)} user={user!} onLogout={handleLogout} onSync={handleSync} isDirty={isDirty} isSyncing={isSyncing} syncLabel={syncLabel} syncColor={syncColor}>
      <div className="p-3 md:p-6 pb-24 md:pb-20">
        {activePage === 'dashboard' && <Dashboard />}
        {activePage === 'allotment' && <AllotmentPage />}
        {activePage === 'collections' && <Collections />}
        {activePage === 'reports' && <Reports />}
        {activePage === 'masters' && renderMasters()}
        {activePage === 'my_portal' && user.memberId && <MemberPortal memberId={user.memberId} />}
        
        {activePage === 'chits' && (
          <div className="ms-bg-card p-4 md:p-6 rounded border ms-border ms-shadow animate-in">
            <h3 className="text-lg font-bold mb-6">Chit Groups</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {db.getChits().map(c => {
                const cap = getGroupCapacityStatus(c.chitGroupId);
                return (
                  <div key={c.chitGroupId} className="p-4 border ms-border rounded hover:border-blue-300 transition-all bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-blue-600">{c.name}</h4>
                      <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{c.status}</span>
                    </div>
                    <div className="text-xs space-y-1.5 text-gray-600">
                      <p className="flex justify-between"><span>Value:</span> <span className="font-semibold text-gray-900">₹{c.chitValue.toLocaleString()}</span></p>
                      <p className="flex justify-between"><span>Duration:</span> <span className="font-semibold text-gray-900">{c.totalMonths} Months</span></p>
                      <p className="flex justify-between"><span>Capacity:</span> <span className="font-semibold text-gray-900">{cap?.current} / {cap?.max}</span></p>
                      <p className="flex justify-between"><span>UPI ID:</span> <span className="font-mono text-[10px] text-gray-500">{c.upiId || 'Not Set'}</span></p>
                    </div>
                    {c.whatsappGroupLink && (
                      <a href={c.whatsappGroupLink} target="_blank" rel="noreferrer" className="mt-4 block w-full py-2 text-center text-[10px] font-bold text-green-600 border border-green-200 rounded hover:bg-green-50 uppercase">Open WA Group</a>
                    )}
                  </div>
                );
              })}
            </div>
            {db.getChits().length === 0 && <p className="text-center py-20 text-gray-400 text-sm">No chit groups found.</p>}
          </div>
        )}

        {activePage === 'members' && (
          <div className="ms-bg-card p-4 md:p-6 rounded border ms-border ms-shadow animate-in">
            <h3 className="text-lg font-bold mb-6">Member Directory</h3>
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-left text-sm min-w-full">
                <thead className="bg-gray-50 border-b ms-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">ID / Name</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Mobile</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">ID Proof</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {db.getMembers().map(m => (
                    <tr key={m.memberId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">{m.memberId}</div>
                        <div className="font-semibold text-gray-900">{m.name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{m.mobile}</td>
                      <td className="px-4 py-3 text-xs">{m.idProofType}: {m.idProofNumber}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{m.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {db.getMembers().length === 0 && <p className="text-center py-20 text-gray-400 text-sm">No members found.</p>}
          </div>
        )}
      </div>
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t p-2 text-center md:hidden z-30 pointer-events-none">
        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest opacity-80">Powered by Guntupally Technology Services</div>
      </footer>
    </Layout>
  );
};

export default App;
