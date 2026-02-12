
import { db } from '../db';

/**
 * Core business rule 4.2: Central installment calculation
 */
export function getInstallmentAmount(chitGroupId: string, memberId: string, monthNo: number): number {
  const chit = db.getChits().find(c => c.chitGroupId === chitGroupId);
  if (!chit) return 0;

  const confirmedAllotment = db.getAllotments().find(a => 
    a.chitGroupId === chitGroupId && 
    a.memberId === memberId && 
    a.isConfirmed && 
    !a.revoked
  );

  // If no confirmed allotment exists for this member in this group
  if (!confirmedAllotment) {
    return chit.monthlyInstallmentRegular;
  }

  const allotmentMonth = confirmedAllotment.monthNo;

  if (monthNo < allotmentMonth) {
    return chit.monthlyInstallmentRegular;
  }

  if (monthNo === allotmentMonth) {
    // According to rule 4.2: use existing prize-month rule
    // Usually prize month amount might be the regular one or a specific logic.
    // Spec says "do not invent a new formula", return what's in the schedule
    const sched = db.getInstallments().find(s => 
      s.chitGroupId === chitGroupId && 
      s.memberId === memberId && 
      s.monthNo === monthNo
    );
    return sched?.dueAmount || chit.monthlyInstallmentRegular;
  }

  if (monthNo > allotmentMonth) {
    return chit.monthlyInstallmentAllotted;
  }

  return chit.monthlyInstallmentRegular;
}

/**
 * Calculates current status for a member in a specific month
 */
export function getInstallmentStatus(chitGroupId: string, memberId: string, monthNo: number) {
  const sched = db.getInstallments().find(s => 
    s.chitGroupId === chitGroupId && 
    s.memberId === memberId && 
    s.monthNo === monthNo
  );
  if (!sched) return { due: 0, paid: 0, balance: 0, status: 'N/A' };
  
  const due = getInstallmentAmount(chitGroupId, memberId, monthNo);
  const paid = sched.paidAmount;
  const balance = Math.max(0, due - paid);
  
  return {
    due,
    paid,
    balance,
    status: sched.status
  };
}
