
import React, { useState } from 'react';
import { db } from '../db';
import { PaymentStatus, PaymentMode } from '../types';
import { getInstallmentStatus } from '../services/logicService';
import { sendPaymentLink, sendReceipt } from '../services/whatsappService';

const Collections: React.FC = () => {
  const chits = db.getChits();
  const [selectedChit, setSelectedChit] = useState(chits[0]?.chitGroupId || '');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [showCollectDialog, setShowCollectDialog] = useState<any>(null);

  const currentChit = chits.find(c => c.chitGroupId === selectedChit);
  const memberships = db.getMemberships().filter(m => m.chitGroupId === selectedChit);
  const members = db.getMembers();

  const handleCollect = (formData: any) => {
    const { memberId, amount, mode, ref } = formData;
    const member = members.find(m => m.memberId === memberId);
    
    db.addPayment({
      paymentId: `pay_${Date.now()}`,
      chitGroupId: selectedChit,
      memberId,
      monthNo: selectedMonth,
      paidAmount: Number(amount),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: mode,
      referenceNo: ref,
      collectedBy: 'admin'
    });

    // Auto WhatsApp Receipt on successful collection
    if (member && currentChit) {
      sendReceipt(selectedChit, memberId, member.mobile, member.name, currentChit.name, selectedMonth, Number(amount));
    }
    
    setShowCollectDialog(null);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Filters */}
      <div className="ms-bg-card p-4 rounded border ms-border ms-shadow flex flex-col md:flex-row items-stretch md:items-end gap-4 mx-0">
        <div className="flex flex-col flex-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Select Group</label>
          <select 
            value={selectedChit}
            onChange={(e) => setSelectedChit(e.target.value)}
            className="border ms-border p-2 rounded text-sm outline-none w-full bg-white"
          >
            {chits.map(c => <option key={c.chitGroupId} value={c.chitGroupId}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col w-full md:w-32">
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Month</label>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border ms-border p-2 rounded text-sm outline-none w-full bg-white"
          >
            {Array.from({length: currentChit?.totalMonths || 0}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>M{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop View Table */}
      <div className="hidden md:block ms-bg-card rounded border ms-border ms-shadow overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b ms-border">
            <tr>
              <th className="px-6 py-3 font-semibold text-gray-600">Token</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Member</th>
              <th className="px-6 py-3 font-semibold text-gray-600 text-right">Due</th>
              <th className="px-6 py-3 font-semibold text-gray-600 text-right">Paid</th>
              <th className="px-6 py-3 font-semibold text-gray-600 text-right">Balance</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-6 py-3 font-semibold text-gray-600 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {memberships.map(gm => {
              const member = members.find(m => m.memberId === gm.memberId);
              const { due, paid, balance, status } = getInstallmentStatus(selectedChit, gm.memberId, selectedMonth);
              return (
                <tr key={gm.groupMembershipId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">#{gm.tokenNo}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{member?.name}</div>
                    <div className="text-xs text-gray-500">{member?.mobile}</div>
                  </td>
                  <td className="px-6 py-4 text-right">₹{due.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-green-600">₹{paid.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">₹{balance.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setShowCollectDialog({ memberId: gm.memberId, name: member?.name, due: balance })}
                        disabled={balance <= 0}
                        className="px-3 py-1.5 rounded text-xs font-bold ms-bg-primary text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-600"
                      >
                        Collect
                      </button>
                      <button 
                        onClick={() => member && currentChit && sendPaymentLink(currentChit.upiId, member.mobile, member.name, currentChit.name, selectedMonth, balance)}
                        disabled={balance <= 0}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-30"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.767 5.767 0 1.267.405 2.436 1.096 3.39l-.79 2.885 2.955-.775a5.727 5.727 0 002.506.582c3.181 0 5.767-2.586 5.767-5.767 0-3.181-2.586-5.767-5.767-5.767zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.435 5.176L2.05 22l4.957-1.301C8.42 21.515 10.138 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {memberships.map(gm => {
          const member = members.find(m => m.memberId === gm.memberId);
          const { due, paid, balance, status } = getInstallmentStatus(selectedChit, gm.memberId, selectedMonth);
          return (
            <div key={gm.groupMembershipId} className="ms-bg-card p-4 rounded-lg border ms-border ms-shadow space-y-3 mx-0">
              <div className="flex justify-between items-start border-b pb-2 border-gray-100">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">TKN #{gm.tokenNo} • {member?.mobile}</div>
                  <div className="font-bold text-gray-900 leading-tight truncate max-w-[150px]">{member?.name}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 text-center border-b pb-3 border-gray-50">
                <div><div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Due</div><div className="text-xs font-semibold">₹{due}</div></div>
                <div><div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Paid</div><div className="text-xs text-green-600 font-semibold">₹{paid}</div></div>
                <div><div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Bal</div><div className="text-xs text-red-600 font-bold">₹{balance}</div></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button 
                  onClick={() => setShowCollectDialog({ memberId: gm.memberId, name: member?.name, due: balance })}
                  disabled={balance <= 0}
                  className="flex-1 py-3 rounded-md text-xs font-bold ms-bg-primary text-white disabled:opacity-20 active:scale-95 transition-transform shadow-sm"
                >
                  Collect
                </button>
                <button 
                  onClick={() => member && currentChit && sendPaymentLink(currentChit.upiId, member.mobile, member.name, currentChit.name, selectedMonth, balance)}
                  disabled={balance <= 0}
                  className="px-5 py-3 border ms-border rounded-md text-green-600 flex items-center justify-center disabled:opacity-20 active:scale-95 transition-transform bg-white"
                  aria-label="Send reminder"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.767 5.767 0 1.267.405 2.436 1.096 3.39l-.79 2.885 2.955-.775a5.727 5.727 0 002.506.582c3.181 0 5.767-2.586 5.767-5.767 0-3.181-2.586-5.767-5.767-5.767zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.435 5.176L2.05 22l4.957-1.301C8.42 21.515 10.138 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                </button>
              </div>
            </div>
          );
        })}
        {memberships.length === 0 && <div className="text-center py-20 text-gray-400 text-sm italic">No records found for this group.</div>}
      </div>

      {showCollectDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="ms-bg-card p-6 rounded-xl w-full max-w-md ms-shadow animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-5 border-b pb-3 truncate pr-4">Payment: {showCollectDialog.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Amount (₹)</label>
                <input type="number" id="payAmount" defaultValue={showCollectDialog.due} className="w-full border ms-border p-3 rounded text-sm font-semibold bg-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Payment Mode</label>
                <select id="payMode" className="w-full border ms-border p-3 rounded text-sm bg-white">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / Online</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Ref / Note</label>
                <input type="text" id="payRef" placeholder="Transaction ID or Note" className="w-full border ms-border p-3 rounded text-sm bg-white" />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowCollectDialog(null)} className="flex-1 py-3 border rounded-md font-semibold text-gray-600 bg-white text-sm">Cancel</button>
                <button onClick={() => handleCollect({
                  memberId: showCollectDialog.memberId,
                  amount: (document.getElementById('payAmount') as HTMLInputElement).value,
                  mode: (document.getElementById('payMode') as HTMLSelectElement).value,
                  ref: (document.getElementById('payRef') as HTMLInputElement).value,
                })} className="flex-1 py-3 ms-bg-primary text-white rounded-md font-bold shadow-md active:scale-95 transition-transform text-sm">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collections;
