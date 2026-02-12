
import React, { useMemo, useState } from 'react';
import { db } from '../db';
import { getInstallmentStatus } from '../services/logicService';
import { PaymentStatus } from '../types';

interface Props {
  memberId: string;
}

const MemberPortal: React.FC<Props> = ({ memberId }) => {
  const members = db.getMembers();
  const currentMember = members.find(m => m.memberId === memberId);
  const memberships = db.getMemberships().filter(ms => ms.memberId === memberId);
  const chits = db.getChits();
  const allotments = db.getAllotments();
  const payments = db.getPayments();

  const activeGroup = memberships.length > 0 ? chits.find(c => c.chitGroupId === memberships[0].chitGroupId) : null;
  const membershipInfo = memberships.length > 0 ? memberships[0] : null;

  // Monthly Installment Dropdown Logic
  const [selectedMonth, setSelectedMonth] = useState<number>(1);

  const monthStatus = useMemo(() => {
    if (!activeGroup) return null;
    const status = getInstallmentStatus(activeGroup.chitGroupId, memberId, selectedMonth);
    // Fetch transaction record for the specific selected month
    const record = payments.find(p => 
      p.chitGroupId === activeGroup.chitGroupId && 
      p.memberId === memberId && 
      p.monthNo === selectedMonth
    );
    return { ...status, paidDate: record?.paymentDate, paymentMode: record?.paymentMode };
  }, [activeGroup, memberId, selectedMonth, payments]);

  const financialSummary = useMemo(() => {
    if (!activeGroup || !membershipInfo) return { totalPaid: 0, outstanding: 0 };
    let totalPaid = 0;
    let totalDue = 0;
    for (let m = 1; m <= activeGroup.totalMonths; m++) {
      const { due, paid } = getInstallmentStatus(activeGroup.chitGroupId, memberId, m);
      totalPaid += paid;
      totalDue += due;
    }
    return { totalPaid, outstanding: Math.max(0, totalDue - totalPaid) };
  }, [activeGroup, membershipInfo, memberId]);

  const groupWinners = useMemo(() => {
    if (!activeGroup) return [];
    return allotments
      .filter(a => a.chitGroupId === activeGroup.chitGroupId && a.isConfirmed && !a.revoked)
      .sort((a, b) => a.monthNo - b.monthNo);
  }, [activeGroup, allotments]);

  const isAllotted = groupWinners.some(w => w.memberId === memberId);

  if (!currentMember || !activeGroup) {
    return <div className="p-8 text-center text-gray-500">No active chit group found for your profile.</div>;
  }

  // Dynamic Payment Link Construction (Read from Admin settings in group master)
  const isMonthPaid = monthStatus?.status === PaymentStatus.PAID;
  const upiLink = activeGroup.upiId && monthStatus && monthStatus.balance > 0
    ? `upi://pay?pa=${activeGroup.upiId}&pn=BhadrakaliChits&am=${monthStatus.balance}&cu=INR&tn=${encodeURIComponent(`M${selectedMonth} Installment - ${currentMember.name}`)}`
    : null;

  return (
    <div className="space-y-6 animate-in p-4 max-w-4xl mx-auto">
      {/* Header Profile Section */}
      <div className="ms-bg-card p-6 rounded-lg border ms-border ms-shadow">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black text-blue-600 uppercase tracking-tight">{currentMember.name}</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{activeGroup.name} • Token #{membershipInfo?.tokenNo}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isAllotted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            {isAllotted ? 'Allotted' : 'Awaiting Allotment'}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t ms-border">
          <div className="p-4 bg-gray-50 rounded border ms-border">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Grand Total Paid</p>
            <p className="text-2xl font-black text-green-600">₹{financialSummary.totalPaid.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded border ms-border">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Outstanding</p>
            <p className="text-2xl font-black text-red-600">₹{financialSummary.outstanding.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Monthly Installment Tracker */}
      <div className="ms-bg-card p-6 rounded-lg border ms-border ms-shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Installment Tracker</h3>
          <div className="w-full sm:w-48">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white border ms-border rounded p-2 text-sm w-full font-bold outline-none"
            >
              {Array.from({ length: activeGroup.totalMonths }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Installment Month {m}</option>
              ))}
            </select>
          </div>
        </div>

        {monthStatus && (
          <div className="animate-in border rounded-lg overflow-hidden">
            <div className={`p-4 flex justify-between items-center ${isMonthPaid ? 'bg-green-50' : 'bg-red-50'}`}>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Status for Month {selectedMonth}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-sm font-black uppercase ${isMonthPaid ? 'text-green-700' : 'text-red-700'}`}>
                    {isMonthPaid ? '● Paid' : '○ Unpaid'}
                  </span>
                  {monthStatus.paidDate && (
                    <span className="text-[10px] text-gray-400 font-medium">on {monthStatus.paidDate}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Installment Amount</p>
                <p className="text-lg font-black text-gray-900">₹{monthStatus.due.toLocaleString()}</p>
              </div>
            </div>

            <div className="p-4 bg-white space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount Received:</span>
                <span className="font-bold text-green-600">₹{monthStatus.paid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-3">
                <span className="text-gray-500">Balance Pending:</span>
                <span className={`font-black ${monthStatus.balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  ₹{monthStatus.balance.toLocaleString()}
                </span>
              </div>

              {!isMonthPaid && upiLink && (
                <div className="mt-4 pt-4 border-t border-dashed">
                  <p className="text-[10px] font-bold text-blue-800 uppercase text-center mb-3">Instant Payment via UPI</p>
                  <a 
                    href={upiLink} 
                    className="block w-full py-3 ms-bg-primary text-white text-center font-bold rounded shadow-lg active:scale-95 transition-transform"
                  >
                    Pay ₹{monthStatus.balance.toLocaleString()} Now
                  </a>
                  <p className="text-[9px] text-gray-400 text-center mt-2 font-medium">Clicking will open your preferred UPI App (PhonePe, GPay, etc.)</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Group Progress Table */}
      <div className="ms-bg-card rounded-lg border ms-border ms-shadow overflow-hidden">
        <h3 className="p-4 text-[10px] font-bold border-b text-gray-400 uppercase tracking-widest bg-gray-50">Group Progress (Winners)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b text-gray-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4">Month</th>
                <th className="px-6 py-4">Winner</th>
                <th className="px-6 py-4 text-right">Prize Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {groupWinners.map((w, idx) => (
                <tr key={idx} className={w.memberId === memberId ? 'bg-blue-50 font-bold' : ''}>
                  <td className="px-6 py-4 text-gray-500">M{w.monthNo}</td>
                  <td className="px-6 py-4 text-gray-900">{members.find(m => m.memberId === w.memberId)?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-right text-blue-600">₹{w.allottedAmount.toLocaleString()}</td>
                </tr>
              ))}
              {groupWinners.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400 italic">No allotments have been made yet in this group.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest py-8">
        Read-Only Member Portal Access
      </div>
    </div>
  );
};

export default MemberPortal;
