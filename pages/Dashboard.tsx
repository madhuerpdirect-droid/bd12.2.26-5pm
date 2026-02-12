
import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const chits = db.getChits();
  const [selectedChitId, setSelectedChitId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');

  const members = db.getMembers();
  const installments = db.getInstallments();
  const payments = db.getPayments();
  const allotments = db.getAllotments();

  const targetChitIds = useMemo(() => {
    if (selectedChitId === 'all') {
      return chits.map(c => c.chitGroupId);
    }
    return [selectedChitId];
  }, [selectedChitId, chits]);

  const targetChits = useMemo(() => 
    chits.filter(c => targetChitIds.includes(c.chitGroupId)),
  [chits, targetChitIds]);

  const maxMonthsInSection = useMemo(() => {
    if (targetChits.length === 0) return 0;
    return Math.max(...targetChits.map(c => c.totalMonths));
  }, [targetChits]);

  const filteredInstallments = installments.filter(s => {
    const chitMatch = targetChitIds.includes(s.chitGroupId);
    const monthMatch = selectedMonth === 'all' || s.monthNo === selectedMonth;
    return chitMatch && monthMatch;
  });

  const filteredPayments = payments.filter(p => {
    const chitMatch = targetChitIds.includes(p.chitGroupId);
    const monthMatch = selectedMonth === 'all' || p.monthNo === selectedMonth;
    return chitMatch && monthMatch;
  });

  const filteredAllotments = allotments.filter(a => {
    const chitMatch = targetChitIds.includes(a.chitGroupId);
    const monthMatch = selectedMonth === 'all' || a.monthNo === selectedMonth;
    return chitMatch && monthMatch && a.isConfirmed && !a.revoked;
  });

  const totalCollected = filteredPayments.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalOutstanding = filteredInstallments.reduce((sum, s) => sum + Math.max(0, s.dueAmount - s.paidAmount), 0);
  const totalAllotted = filteredAllotments.reduce((sum, a) => sum + a.allottedAmount, 0);
  const netBalance = totalCollected - totalAllotted;

  const activeChitCount = targetChits.length;
  
  const targetMemberships = db.getMemberships().filter(ms => targetChitIds.includes(ms.chitGroupId));
  const uniqueMemberIds = new Set(targetMemberships.map(ms => ms.memberId));
  const activeMemberCount = Array.from(uniqueMemberIds).filter(id => {
    const m = members.find(mem => mem.memberId === id);
    return m && m.isActive;
  }).length;

  const handleMessageGroup = () => {
    if (selectedChitId === 'all') {
      alert('Please select a specific group to message.');
      return;
    }
    const currentChit = chits.find(c => c.chitGroupId === selectedChitId);
    if (!currentChit) return;
    
    if (currentChit.whatsappGroupLink) {
      window.open(currentChit.whatsappGroupLink, '_blank');
    } else {
      alert('WhatsApp Group Link not found for this group. Update it in Masters.');
    }
  };

  const cards = [
    { label: 'Active Groups', value: activeChitCount, icon: '📋', color: 'text-blue-600' },
    { label: 'Total Members', value: activeMemberCount, icon: '👥', color: 'text-purple-600' },
    { label: 'Total Collection', value: `₹${totalCollected.toLocaleString()}`, icon: '💰', color: 'text-green-600' },
    { label: 'Outstanding', value: `₹${totalOutstanding.toLocaleString()}`, icon: '⏳', color: 'text-red-600' },
  ];

  const groupLabel = selectedChitId === 'all' ? 'All Groups (Consolidated)' : (targetChits[0]?.name || 'Selection');
  const summaryText = selectedMonth === 'all' 
    ? `Grand Total analysis for ${groupLabel}`
    : `${groupLabel} data for Month ${selectedMonth}`;

  const hasData = filteredPayments.length > 0 || filteredInstallments.length > 0;

  return (
    <div className="space-y-6 animate-in">
      {/* Selection Control */}
      <div className="ms-bg-card p-4 rounded border ms-border ms-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase">Dashboard Filter Logic</h3>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
           <div className="flex flex-col flex-1 min-w-[180px]">
             <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Select Group</label>
             <select 
               className="border ms-border rounded p-2 text-sm outline-none w-full"
               value={selectedChitId}
               onChange={(e) => {
                 setSelectedChitId(e.target.value);
                 setSelectedMonth('all'); 
               }}
             >
                <option value="all">All Groups (Consolidated)</option>
                <optgroup label="Individual Groups">
                  {chits.map(c => <option key={c.chitGroupId} value={c.chitGroupId}>{c.name}</option>)}
                </optgroup>
             </select>
           </div>
           <div className="flex flex-col flex-1 min-w-[140px]">
             <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Time Period</label>
             <select 
               className="border ms-border rounded p-2 text-sm outline-none w-full"
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
             >
                <option value="all">Full Tenure (All Months)</option>
                {Array.from({length: maxMonthsInSection}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Month {m}</option>
                ))}
             </select>
           </div>
           {selectedChitId !== 'all' && (
             <button 
               onClick={handleMessageGroup}
               className="mt-4 md:mt-0 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:bg-green-700 uppercase self-end"
             >
               Message Group
             </button>
           )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="ms-bg-card p-6 rounded border ms-border ms-shadow flex items-center justify-between transition-transform active:scale-95">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
              <h3 className={`text-xl md:text-2xl font-bold ${card.color}`}>{card.value}</h3>
            </div>
            <div className="text-2xl md:text-3xl opacity-50">{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Performance Charts */}
      <div className="ms-bg-card rounded border ms-border ms-shadow overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase">Collection vs Target</h3>
            {!hasData && <span className="text-[10px] font-bold text-red-500 italic">No records found for this selection</span>}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Target Due', value: filteredInstallments.reduce((s,i) => s + i.dueAmount, 0) },
                { name: 'Collections', value: totalCollected }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                   cursor={{fill: '#f8f9fa'}} 
                   formatter={(value: number) => `₹${value.toLocaleString()}`}
                   contentStyle={{borderRadius: '6px', border: '1px solid #edebe9', fontSize: '12px'}} 
                />
                <Bar dataKey="value" fill="#0078d4" radius={[6, 6, 0, 0]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t ms-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Selection Status</p>
            <p className="text-xs text-gray-600 font-medium italic">{summaryText}</p>
          </div>
          <div className="flex gap-8">
            <div className="text-center sm:text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Prize Payouts</p>
              <p className="text-sm font-bold text-gray-700">₹{totalAllotted.toLocaleString()}</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Net Cash Balance</p>
              <p className={`text-lg font-black ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{netBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
