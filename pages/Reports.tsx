
import React, { useState } from 'react';
import { db } from '../db';
import { getInstallmentStatus } from '../services/logicService';
import { sendPaymentLink, sendReceipt } from '../services/whatsappService';

const Reports: React.FC = () => {
  const chits = db.getChits();
  const members = db.getMembers();
  const [reportType, setReportType] = useState<'ledger' | 'outstanding'>('outstanding');
  const [selectedChit, setSelectedChit] = useState(chits[0]?.chitGroupId || '');
  const [selectedMember, setSelectedMember] = useState('');

  const currentChit = chits.find(c => c.chitGroupId === selectedChit);

  const renderOutstandingReport = () => {
    const memberships = db.getMemberships().filter(gm => gm.chitGroupId === selectedChit);
    
    // Pre-calculate data for cleaner rendering
    const reportData = memberships.map(gm => {
      const member = members.find(m => m.memberId === gm.memberId);
      let totalDue = 0, totalPaid = 0;
      for (let m = 1; m <= (currentChit?.totalMonths || 0); m++) {
        const { due, paid } = getInstallmentStatus(selectedChit, gm.memberId, m);
        totalDue += due;
        totalPaid += paid;
      }
      return {
        membership: gm,
        member,
        outstanding: totalDue - totalPaid
      };
    });

    return (
      <div className="space-y-4">
        {/* Desktop View Table */}
        <div className="hidden md:block ms-bg-card rounded border ms-border ms-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b ms-border">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-600">Token</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Member</th>
                  <th className="px-6 py-3 font-semibold text-gray-600 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {reportData.map(({ membership, member, outstanding }) => (
                  <tr key={membership.groupMembershipId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-400">#{membership.tokenNo}</td>
                    <td className="px-6 py-3 font-semibold text-gray-900">{member?.name}</td>
                    <td className="px-6 py-3 text-right font-bold text-red-600">₹{outstanding.toLocaleString()}</td>
                  </tr>
                ))}
                {reportData.length === 0 && <tr><td colSpan={3} className="p-20 text-center text-gray-400">No data for this group.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View Stack (Cards) */}
        <div className="md:hidden space-y-3">
          {reportData.map(({ membership, member, outstanding }) => (
            <div key={membership.groupMembershipId} className="ms-bg-card p-4 rounded-lg border ms-border ms-shadow flex justify-between items-center transition-transform active:scale-[0.98] mx-0">
              <div className="flex flex-col">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">TKN #{membership.tokenNo}</div>
                <div className="text-sm font-bold text-gray-900 truncate max-w-[180px]">{member?.name}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total Due</div>
                <div className="text-sm font-black text-red-600">₹{outstanding.toLocaleString()}</div>
              </div>
            </div>
          ))}
          {reportData.length === 0 && <div className="p-16 text-center text-gray-400 italic text-sm">No records found for this group.</div>}
        </div>
      </div>
    );
  };

  const renderLedgerReport = () => {
    if (!selectedMember) return <div className="p-16 text-center text-gray-400 text-sm ms-bg-card border rounded ms-border ms-shadow mx-0 bg-white italic">Please select a member above.</div>;
    const member = members.find(m => m.memberId === selectedMember);
    const months = Array.from({length: currentChit?.totalMonths || 0}, (_, i) => i + 1);

    return (
      <div className="space-y-4">
        <div className="ms-bg-card p-4 rounded border ms-border flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 gap-2 mx-0">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Member</div>
            <div className="text-base font-bold text-gray-900 leading-tight">{member?.name}</div>
          </div>
          <div className="text-left md:text-right">
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mobile / Group</div>
             <div className="text-sm font-semibold text-blue-600">{member?.mobile} • {currentChit?.name}</div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block ms-bg-card rounded border ms-border ms-shadow overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold">Month</th>
                <th className="px-6 py-3 text-right">Due Amount</th>
                <th className="px-6 py-3 text-right text-green-700">Received</th>
                <th className="px-6 py-3 text-right text-red-600">Pending</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {months.map(m => {
                const { due, paid, balance, status } = getInstallmentStatus(selectedChit, selectedMember, m);
                return (
                  <tr key={m} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-500">M{m}</td>
                    <td className="px-6 py-4 text-right">₹{due.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">₹{paid.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-bold">₹{balance.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>{status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {status === 'paid' ? (
                        <button onClick={() => member && currentChit && sendReceipt(selectedChit, selectedMember, member.mobile, member.name, currentChit.name, m, paid)} className="text-blue-600 hover:underline text-[10px] font-bold">RECEIPT</button>
                      ) : (
                        <button onClick={() => member && currentChit && sendPaymentLink(currentChit.upiId, member.mobile, member.name, currentChit.name, m, balance)} className="text-green-600 hover:underline text-[10px] font-bold">REMIND</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Ledger Card View */}
        <div className="md:hidden space-y-3">
          {months.map(m => {
            const { due, paid, balance, status } = getInstallmentStatus(selectedChit, selectedMember, m);
            return (
              <div key={m} className="ms-bg-card p-4 rounded-lg border ms-border flex flex-col gap-3 mx-0 shadow-sm bg-white">
                <div className="flex justify-between items-center border-b pb-2 border-gray-50">
                   <div className="font-bold text-gray-500 uppercase text-xs tracking-wider">Month {m}</div>
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>{status}</span>
                </div>
                <div className="grid grid-cols-3 text-center">
                   <div><div className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Due</div><div className="text-sm font-semibold">₹{due}</div></div>
                   <div><div className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Paid</div><div className="text-sm text-green-600 font-semibold">₹{paid}</div></div>
                   <div><div className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Bal</div><div className="text-sm text-red-600 font-bold">₹{balance}</div></div>
                </div>
                <div className="pt-2 border-t mt-1 border-gray-50">
                   {status === 'paid' ? (
                      <button onClick={() => member && currentChit && sendReceipt(selectedChit, selectedMember, member.mobile, member.name, currentChit.name, m, paid)} className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-md font-bold text-xs uppercase tracking-widest active:bg-blue-100 shadow-sm">WhatsApp Receipt</button>
                   ) : (
                      <button onClick={() => member && currentChit && sendPaymentLink(currentChit.upiId, member.mobile, member.name, currentChit.name, m, balance)} className="w-full py-2.5 bg-green-50 text-green-600 rounded-md font-bold text-xs uppercase tracking-widest active:bg-green-100 shadow-sm">Send Reminder</button>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b ms-border no-scrollbar -mx-1 px-1">
        <button onClick={() => setReportType('outstanding')} className={`px-4 py-2.5 text-[10px] md:text-xs font-bold rounded whitespace-nowrap transition-all shrink-0 ${reportType === 'outstanding' ? 'ms-bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 border ms-border bg-white'}`}>Outstanding Report</button>
        <button onClick={() => setReportType('ledger')} className={`px-4 py-2.5 text-[10px] md:text-xs font-bold rounded whitespace-nowrap transition-all shrink-0 ${reportType === 'ledger' ? 'ms-bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 border ms-border bg-white'}`}>Member Ledger</button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
           <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Group</label>
           <select value={selectedChit} onChange={(e) => {setSelectedChit(e.target.value); setSelectedMember('');}} className="w-full border p-3 rounded text-sm outline-none bg-white">{chits.map(c => <option key={c.chitGroupId} value={c.chitGroupId}>{c.name}</option>)}</select>
        </div>
        {reportType === 'ledger' && (
          <div className="flex-1 animate-in">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Member</label>
            <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="w-full border p-3 rounded text-sm outline-none bg-white">
              <option value="">-- Choose Member --</option>
              {db.getMemberships().filter(gm => gm.chitGroupId === selectedChit).map(gm => {
                const m = members.find(mem => mem.memberId === gm.memberId);
                return <option key={gm.memberId} value={gm.memberId}>{m?.name}</option>;
              })}
            </select>
          </div>
        )}
      </div>
      <div>{reportType === 'outstanding' ? renderOutstandingReport() : renderLedgerReport()}</div>
    </div>
  );
};

export default Reports;
