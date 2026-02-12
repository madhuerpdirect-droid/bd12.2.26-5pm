
import React, { useState } from 'react';
import { db } from '../db';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { getInstallmentStatus } from '../services/logicService';

const AllotmentPage: React.FC = () => {
  const chits = db.getChits();
  const allotments = db.getAllotments();
  const members = db.getMembers();

  const [selectedChit, setSelectedChit] = useState(chits[0]?.chitGroupId || '');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedMember, setSelectedMember] = useState('');
  const [prizeAmount, setPrizeAmount] = useState(0);
  
  const [adminVerifyModal, setAdminVerifyModal] = useState<string | null>(null); // allotmentId
  const [editModal, setEditModal] = useState<any>(null); // allotment data
  const [adminPassword, setAdminPassword] = useState('');

  const currentChit = chits.find(c => c.chitGroupId === selectedChit);
  const existingMonthAllotment = allotments.find(a => 
    a.chitGroupId === selectedChit && 
    a.monthNo === selectedMonth && 
    a.isConfirmed && 
    !a.revoked
  );

  const memberships = db.getMemberships().filter(m => m.chitGroupId === selectedChit);
  const alreadyWonMemberIds = allotments
    .filter(a => a.chitGroupId === selectedChit && a.isConfirmed && !a.revoked)
    .map(a => a.memberId);
  
  const candidates = memberships
    .filter(gm => !alreadyWonMemberIds.includes(gm.memberId))
    .map(gm => members.find(m => m.memberId === gm.memberId))
    .filter(m => m && m.isActive);

  const handleConfirm = () => {
    if (!selectedMember || prizeAmount <= 0) return alert('Select winner and amount.');
    const statusInfo = getInstallmentStatus(selectedChit, selectedMember, selectedMonth);
    if (statusInfo.status !== 'paid') return alert(`Restriction: Member has not paid for Month ${selectedMonth}.`);
    
    db.confirmAllotment({
      allotmentId: `allot_${Date.now()}`,
      chitGroupId: selectedChit,
      monthNo: selectedMonth,
      memberId: selectedMember,
      allottedAmount: prizeAmount,
      isConfirmed: true,
      createdAt: new Date().toISOString(),
      createdBy: 'admin'
    });
    setSelectedMember('');
    setPrizeAmount(0);
  };

  const verifyAdmin = () => {
    // Strictly validate against xdr5tgb
    if (adminPassword === 'xdr5tgb') {
      const a = allotments.find(allot => allot.allotmentId === adminVerifyModal);
      setEditModal(a);
      setAdminVerifyModal(null);
      setAdminPassword('');
    } else {
      alert('Incorrect Password. Access Denied.');
    }
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    const t = e.target as any;
    const winnerId = t.winner.value;
    const amount = Number(t.amount.value);
    
    const otherWins = allotments.find(a => a.chitGroupId === editModal.chitGroupId && a.memberId === winnerId && a.allotmentId !== editModal.allotmentId && !a.revoked);
    if (otherWins) return alert('This member has already won in another month.');

    db.updateAllotment(editModal.allotmentId, { memberId: winnerId, allottedAmount: amount });
    setEditModal(null);
    alert('Allotment updated successfully.');
  };

  const handleNotifyWinner = (member: any, allotment: any) => {
    const message = `Congratulations! The Month ${allotment.monthNo} chit has been allotted to you for an amount of ₹${allotment.allottedAmount.toLocaleString()}. Please note: Your Chit installment will increase to ₹${currentChit?.monthlyInstallmentAllotted.toLocaleString()}, starting from next month onward.`;
    sendWhatsAppMessage(member.mobile, message);
  };

  const filteredAllotments = allotments.filter(a => a.chitGroupId === selectedChit).sort((a, b) => b.monthNo - a.monthNo);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="ms-bg-card p-5 md:p-6 rounded-lg border ms-border ms-shadow space-y-4">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest border-b pb-3">Allotment Processor</h3>
          <div className="grid grid-cols-2 gap-4">
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Group</label>
                <select className="border p-2 rounded text-sm bg-white" value={selectedChit} onChange={(e) => setSelectedChit(e.target.value)}>
                   {chits.map(c => <option key={c.chitGroupId} value={c.chitGroupId}>{c.name}</option>)}
                </select>
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Month</label>
                <select className="border p-2 rounded text-sm bg-white" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                   {currentChit && Array.from({length: currentChit.totalMonths}, (_, i) => i + 1).map(m => <option key={m} value={m}>M{m}</option>)}
                </select>
             </div>
          </div>
          {existingMonthAllotment ? (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-bold text-blue-600 uppercase mb-1">ALREADY ALLOTTED</p>
              <p className="text-sm font-bold text-gray-900 leading-tight mb-1">{members.find(m => m.memberId === existingMonthAllotment.memberId)?.name}</p>
              <p className="text-xl font-black text-blue-700">₹{existingMonthAllotment.allottedAmount.toLocaleString()}</p>
            </div>
          ) : (
            <div className="space-y-4 border-t pt-4 border-gray-100">
              <div><label className="text-[10px] uppercase font-bold text-gray-400">Winner Selection</label>
                <select className="w-full border p-2.5 rounded bg-white text-sm" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}>
                  <option value="">-- Choose Candidate --</option>
                  {candidates.map(c => {
                    const statusInfo = getInstallmentStatus(selectedChit, c!.memberId, selectedMonth);
                    const paidStatus = statusInfo.status === 'paid' ? 'Paid' : 'Unpaid';
                    return <option key={c?.memberId} value={c?.memberId}>{c?.name} - [{paidStatus}]</option>;
                  })}
                </select>
              </div>
              <div><label className="text-[10px] uppercase font-bold text-gray-400">Prize Amount (₹)</label><input type="number" className="w-full border p-2.5 rounded text-sm bg-white font-semibold" value={prizeAmount || ''} onChange={(e) => setPrizeAmount(Number(e.target.value))} /></div>
              <button onClick={handleConfirm} className="w-full py-3.5 ms-bg-primary text-white rounded font-bold shadow-md active:scale-95 transition-transform text-sm">Confirm Allotment</button>
            </div>
          )}
        </div>
        <div className="ms-bg-card p-5 md:p-6 rounded-lg border ms-border bg-gray-50/50">
          <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4">Admin Instructions</h4>
          <ul className="text-xs text-gray-500 space-y-2.5 list-disc pl-5">
            <li>Member must have paid Month {selectedMonth} installment to be eligible.</li>
            <li>Prize installments increase starting from the month AFTER allotment.</li>
            <li>Net Balance on Dashboard reflects all confirmed prize payouts.</li>
          </ul>
        </div>
      </div>

      <div className="ms-bg-card rounded-lg border ms-border ms-shadow overflow-hidden">
        <h3 className="p-4 text-[10px] font-bold border-b text-gray-400 uppercase tracking-widest bg-gray-50">Allotment Register</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[500px]">
            <thead className="bg-white border-b text-gray-600 font-bold uppercase text-[10px]">
              <tr><th className="px-6 py-4">Month</th><th className="px-6 py-4">Winner Name</th><th className="px-6 py-4 text-right">Prize Amount</th><th className="px-6 py-4 text-center">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredAllotments.map((a, i) => {
                const winner = members.find(m => m.memberId === a.memberId);
                return (
                  <tr key={i} className="hover:bg-gray-50 group transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-400">M{a.monthNo}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{winner?.name}</td>
                    <td className="px-6 py-4 text-right font-black text-green-600">₹{a.allottedAmount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1 md:gap-2">
                        <button onClick={() => handleNotifyWinner(winner, a)} className="p-2 text-green-600 hover:bg-green-50 rounded-full shrink-0" title="Notify Winner"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.767 5.767 0 1.267.405 2.436 1.096 3.39l-.79 2.885 2.955-.775a5.727 5.727 0 002.506.582c3.181 0 5.767-2.586 5.767-5.767 0-3.181-2.586-5.767-5.767-5.767zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.435 5.176L2.05 22l4.957-1.301C8.42 21.515 10.138 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg></button>
                        <button onClick={() => setAdminVerifyModal(a.allotmentId)} className="p-2 text-gray-400 hover:text-blue-600 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0" title="Edit Allotment"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAllotments.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-gray-400 text-sm">No allotments recorded yet for this group.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {adminVerifyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="ms-bg-card p-6 rounded-xl w-full max-w-sm ms-shadow border ms-border animate-in">
             <h4 className="text-lg font-bold mb-4">Master Security</h4>
             <p className="text-xs text-gray-500 mb-4">Enter master password to edit records.</p>
             <input type="password" placeholder="Password" className="w-full border p-3 mb-4 rounded bg-white text-sm" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verifyAdmin()} />
             <div className="flex gap-2">
                <button onClick={() => {setAdminVerifyModal(null); setAdminPassword('');}} className="flex-1 py-3 text-xs font-bold border rounded bg-white">Cancel</button>
                <button onClick={verifyAdmin} className="flex-1 py-3 text-xs font-bold ms-bg-primary text-white rounded">Unlock</button>
             </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleEditSave} className="ms-bg-card p-6 md:p-8 rounded-xl w-full max-w-md ms-shadow border ms-border animate-in">
             <h4 className="text-xl font-black mb-6 border-b pb-4">Edit Allotment (M{editModal.monthNo})</h4>
             <div className="space-y-5">
                <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase">Winner</label>
                   <select name="winner" className="w-full border p-3 rounded bg-white text-sm" defaultValue={editModal.memberId}>
                      {memberships.map(gm => {
                        const m = members.find(mem => mem.memberId === gm.memberId);
                        const statusInfo = getInstallmentStatus(selectedChit, gm.memberId, editModal.monthNo);
                        const paidStatus = statusInfo.status === 'paid' ? 'Paid' : 'Unpaid';
                        return <option key={gm.memberId} value={gm.memberId}>{m?.name} - [{paidStatus}]</option>;
                      })}
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase">Prize Amount (₹)</label>
                   <input required name="amount" type="number" className="w-full border p-3 rounded font-bold bg-white text-sm" defaultValue={editModal.allottedAmount} />
                </div>
                <div className="flex gap-3 pt-4">
                   <button type="button" onClick={() => setEditModal(null)} className="flex-1 py-3 text-sm font-semibold border rounded bg-white">Discard</button>
                   <button type="submit" className="flex-1 py-3 text-sm font-bold ms-bg-primary text-white rounded shadow-lg">Save Changes</button>
                </div>
             </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AllotmentPage;
