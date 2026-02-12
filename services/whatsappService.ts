import { db } from '../db';
import { getInstallmentAmount } from './logicService';

/**
 * Helper to check if the current device is mobile
 */
const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function generateUPILink(upiId: string, amount: number, note: string) {
  return `upi://pay?pa=${upiId}&pn=GTSChit&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
}

/**
 * Sends a WhatsApp message using a strict format required by WhatsApp API.
 * The format MUST be [country code][number] with NO '+' symbol, spaces, or dashes.
 * For India, we use '91' + 10-digit mobile number.
 */
export function sendWhatsAppMessage(mobile: string, message: string) {
  // 1. Remove all non-digit characters (strips '+', '-', ' ', etc.)
  const digits = mobile.replace(/\D/g, '');
  
  // 2. Extract exactly the last 10 digits (the core mobile number)
  const tenDigits = digits.slice(-10);

  // 3. Validation: WhatsApp requires a full international number. 
  // If we don't have exactly 10 digits (excluding country code), the number is invalid for India.
  if (tenDigits.length !== 10) {
    alert(`Invalid Mobile Number: "${mobile}". WhatsApp requires a 10-digit mobile number. Please check the Member profile in Masters.`);
    return;
  }

  const encodedMsg = encodeURIComponent(message);
  const baseUrl = 'https://wa.me';
  
  // 4. Construct URL: '91' prefix is added for India (required for wa.me links to be valid), 
  // and NO '+' symbol is used as requested to avoid the "invalid number" error.
  const url = `${baseUrl}/91${tenDigits}?text=${encodedMsg}`;
  window.open(url, '_blank');
}

export function sendPaymentLink(upiId: string, mobile: string, name: string, chitName: string, monthNo: number, amount: number) {
  const upiLink = generateUPILink(upiId, amount, `M${monthNo} Due`);
  const message = `Payment Reminder: ₹${amount}\nChit: ${chitName}\nMonth: ${monthNo}\n\nPay via UPI: ${upiLink}`;
  sendWhatsAppMessage(mobile, message);
}

export function sendReceipt(chitGroupId: string, memberId: string, mobile: string, name: string, chitName: string, monthNo: number, amount: number) {
  const upcomingDues = [];
  const chit = db.getChits().find(c => c.chitGroupId === chitGroupId);
  if (chit) {
    for (let i = 1; i <= 2; i++) {
      const nextMonth = monthNo + i;
      if (nextMonth <= chit.totalMonths) {
        const dueAmt = getInstallmentAmount(chitGroupId, memberId, nextMonth);
        upcomingDues.push(`Month ${nextMonth}: ₹${dueAmt.toLocaleString()}`);
      }
    }
  }

  let message = `Payment Received: ₹${amount.toLocaleString()}\nChit: ${chitName}\nMonth: ${monthNo}.\n\nThank you for your payment.`;
  if (upcomingDues.length > 0) {
    message += `\n\nUpcoming Installments:\n${upcomingDues.join('\n')}`;
  }
  
  sendWhatsAppMessage(mobile, message);
}