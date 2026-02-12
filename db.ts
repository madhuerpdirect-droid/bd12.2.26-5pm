
import { 
  User, UserRole, ChitGroup, Member, GroupMembership, 
  InstallmentSchedule, Allotment, Payment, PaymentRequest, 
  MasterSettings, ChitStatus, PaymentStatus 
} from './types';
import { put, list } from '@vercel/blob';

const INITIAL_USERS: User[] = [
  { userId: 'u1', name: 'Admin User', role: UserRole.ADMIN, username: 'admin', passwordHash: 'xdr5tgb', isActive: true },
];

const INITIAL_MASTER_SETTINGS: MasterSettings = {
  mastersPasswordHash: 'xdr5tgb',
  lateFeeRules: {},
  receiptTemplateConfig: {},
  whatsappConfig: {}
};

class DB {
  private users: User[] = [];
  private chits: ChitGroup[] = [];
  private members: Member[] = [];
  private memberships: GroupMembership[] = [];
  private installments: InstallmentSchedule[] = [];
  private allotments: Allotment[] = [];
  private payments: Payment[] = [];
  private paymentRequests: PaymentRequest[] = [];
  private settings: MasterSettings = INITIAL_MASTER_SETTINGS;
  private lastUpdated: string = new Date(0).toISOString();
  
  private isDirty: boolean = false;
  private isSyncing: boolean = false;
  private hasLoaded: boolean = false;
  private onDirtyChange?: (dirty: boolean) => void;
  private onSyncChange?: (syncing: boolean) => void;

  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.load();
      if (!this.users || this.users.length === 0) {
        this.users = [...INITIAL_USERS];
        this.saveLocal();
      }
      this.hasLoaded = true;
    } catch (e) {
      console.error("DB Init failed, resetting to defaults", e);
      this.users = [...INITIAL_USERS];
      this.hasLoaded = true;
    }
  }

  setDirtyListener(listener: (dirty: boolean) => void) {
    this.onDirtyChange = listener;
  }

  setSyncListener(listener: (syncing: boolean) => void) {
    this.onSyncChange = listener;
  }

  markDirty() {
    this.isDirty = true;
    this.saveLocal();
    if (this.onDirtyChange) this.onDirtyChange(true);
    
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    
    this.syncDebounceTimer = setTimeout(() => {
      this.syncWithCloud().catch(() => {});
    }, 2000);
  }

  load() {
    const data = localStorage.getItem('mi_chit_db');
    if (data && data !== "null" && data !== "undefined") {
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          this.deserialize(parsed);
        }
      } catch (e) {
        console.error("Corrupted local storage data", e);
      }
    }
  }

  private deserialize(parsed: any) {
    if (!parsed) return;
    this.users = parsed.users || [];
    this.chits = (parsed.chits || []).map((c: any) => ({ ...c, status: c.status || ChitStatus.ACTIVE }));
    this.members = parsed.members || [];
    this.memberships = parsed.memberships || [];
    this.installments = parsed.installments || [];
    this.allotments = parsed.allotments || [];
    this.payments = parsed.payments || [];
    this.paymentRequests = parsed.paymentRequests || [];
    this.settings = parsed.settings || INITIAL_MASTER_SETTINGS;
    this.lastUpdated = parsed.lastUpdated || new Date(0).toISOString();
  }

  public getSerializedData() {
    return JSON.stringify({
      users: this.users,
      chits: this.chits,
      members: this.members,
      memberships: this.memberships,
      installments: this.installments,
      allotments: this.allotments,
      payments: this.payments,
      paymentRequests: this.paymentRequests,
      settings: this.settings,
      lastUpdated: this.lastUpdated
    }, null, 2);
  }

  saveLocal() {
    try {
      this.lastUpdated = new Date().toISOString();
      const dataString = this.getSerializedData();
      localStorage.setItem('mi_chit_db', dataString);
      return true;
    } catch (e) {
      console.error("Critical: Local storage save failed.", e);
      return false;
    }
  }

  async save(): Promise<boolean> {
    this.saveLocal();
    return await this.syncWithCloud();
  }

  async syncWithCloud(): Promise<boolean> {
    if (!navigator.onLine) return false;
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return false;

    this.isSyncing = true;
    if (this.onSyncChange) this.onSyncChange(true);
    
    try {
      const data = this.getSerializedData();
      await put('database.json', data, {
        access: 'public',
        addRandomSuffix: false,
        token: token
      });
      this.isDirty = false;
      if (this.onDirtyChange) this.onDirtyChange(false);
      localStorage.setItem('mi_chit_last_sync', new Date().toISOString());
      return true;
    } catch (error) {
      console.error("Vercel Blob Sync failed:", error);
      return false;
    } finally {
      this.isSyncing = false;
      if (this.onSyncChange) this.onSyncChange(false);
    }
  }

  async loadCloudData(): Promise<boolean> {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!navigator.onLine || !token) return false;

    this.isSyncing = true;
    if (this.onSyncChange) this.onSyncChange(true);

    try {
      const { blobs } = await list({ token });
      const dbBlob = blobs.find(b => b.pathname === 'database.json');
      if (dbBlob) {
        const response = await fetch(`${dbBlob.url}?t=${Date.now()}`);
        if (!response.ok) throw new Error("Cloud fetch failed");
        const onlineData = await response.json();
        const localDataRaw = localStorage.getItem('mi_chit_db');
        const localData = localDataRaw ? JSON.parse(localDataRaw) : null;
        const onlineTime = new Date(onlineData.lastUpdated || 0).getTime();
        const localTime = new Date(localData?.lastUpdated || 0).getTime();
        if (onlineTime > localTime || !localData) {
          this.deserialize(onlineData);
          localStorage.setItem('mi_chit_db', JSON.stringify(onlineData));
          this.isDirty = false;
          if (this.onDirtyChange) this.onDirtyChange(false);
          return true;
        }
      } else {
        await this.syncWithCloud();
      }
      return false;
    } catch (e) {
      console.warn("Could not reach cloud storage:", e);
      return false;
    } finally {
      this.isSyncing = false;
      if (this.onSyncChange) this.onSyncChange(false);
    }
  }

  restore(dataString: string): boolean {
    try {
      const parsed = JSON.parse(dataString);
      if (parsed && typeof parsed === 'object') {
        this.deserialize(parsed);
        this.markDirty();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Restore failed", e);
      return false;
    }
  }

  getUsers = () => this.users || [];
  getChits = () => this.chits || [];
  getMembers = () => this.members || [];
  getMemberships = () => this.memberships || [];
  getInstallments = () => this.installments || [];
  getAllotments = () => this.allotments || [];
  getPayments = () => this.payments || [];
  getPaymentRequests = () => this.paymentRequests || [];
  getSettings = () => this.settings || INITIAL_MASTER_SETTINGS;
  getDirtyStatus = () => this.isDirty;
  getSyncStatus = () => this.isSyncing;

  addMember(member: Member) {
    this.members.push(member);
    this.markDirty();
  }

  updateMember(memberId: string, data: Partial<Member>, targetGroupId?: string) {
    const idx = this.members.findIndex(m => m.memberId === memberId);
    if (idx !== -1) {
      this.members[idx] = { ...this.members[idx], ...data };
      if (targetGroupId) {
        const msIdx = this.memberships.findIndex(m => m.memberId === memberId);
        if (msIdx !== -1) {
          const oldGroupId = this.memberships[msIdx].chitGroupId;
          if (oldGroupId !== targetGroupId) {
            const chit = this.chits.find(c => c.chitGroupId === targetGroupId);
            if (chit && chit.maxMembers) {
              const currentCount = this.memberships.filter(m => m.chitGroupId === targetGroupId).length;
              if (currentCount >= chit.maxMembers) return; 
            }
            this.memberships[msIdx].chitGroupId = targetGroupId;
            this.installments = this.installments.filter(i => !(i.memberId === memberId && i.chitGroupId === oldGroupId));
            if (chit) {
              for (let i = 1; i <= chit.totalMonths; i++) {
                const date = new Date(chit.startMonth);
                date.setMonth(date.getMonth() + i - 1);
                this.installments.push({
                  scheduleId: `s_${this.memberships[msIdx].groupMembershipId}_${i}`,
                  chitGroupId: targetGroupId,
                  memberId: memberId,
                  monthNo: i,
                  dueDate: date.toISOString().split('T')[0],
                  dueAmount: chit.monthlyInstallmentRegular,
                  paidAmount: 0,
                  status: PaymentStatus.PENDING,
                  isPrizeMonth: false
                });
              }
            }
          }
        }
      }
      this.markDirty();
    }
  }

  addChit(chit: ChitGroup) {
    this.chits.push(chit);
    this.markDirty();
  }

  updateChit(chitGroupId: string, data: Partial<ChitGroup>) {
    const idx = this.chits.findIndex(c => c.chitGroupId === chitGroupId);
    if (idx !== -1) {
      this.chits[idx] = { ...this.chits[idx], ...data };
      this.markDirty();
    }
  }

  addMembership(membership: GroupMembership) {
    const exists = this.memberships.find(m => m.chitGroupId === membership.chitGroupId && m.memberId === membership.memberId);
    if (exists) return;
    
    const chit = this.chits.find(c => c.chitGroupId === membership.chitGroupId);
    if (chit && chit.maxMembers) {
      const currentCount = this.memberships.filter(m => m.chitGroupId === membership.chitGroupId).length;
      if (currentCount >= chit.maxMembers) return; 
    }

    this.memberships.push(membership);
    if (chit) {
      for (let i = 1; i <= chit.totalMonths; i++) {
        const date = new Date(chit.startMonth);
        date.setMonth(date.getMonth() + i - 1);
        this.installments.push({
          scheduleId: `s_${membership.groupMembershipId}_${i}`,
          chitGroupId: membership.chitGroupId,
          memberId: membership.memberId,
          monthNo: i,
          dueDate: date.toISOString().split('T')[0],
          dueAmount: chit.monthlyInstallmentRegular,
          paidAmount: 0,
          status: PaymentStatus.PENDING,
          isPrizeMonth: false
        });
      }
    }
    this.markDirty();
  }

  bulkAddMembers(membersList: { member: Member, chitGroupId?: string }[]) {
    const now = Date.now();
    membersList.forEach((item, index) => {
      if (item.chitGroupId) {
        const chit = this.chits.find(c => c.chitGroupId === item.chitGroupId);
        if (chit && chit.maxMembers) {
          const currentCount = this.memberships.filter(m => m.chitGroupId === item.chitGroupId).length;
          if (currentCount >= chit.maxMembers) return; 
        }
      }

      this.members.push(item.member);
      if (item.chitGroupId) {
        const groupMemberships = this.memberships.filter(m => m.chitGroupId === item.chitGroupId);
        const nextToken = groupMemberships.length > 0 ? Math.max(...groupMemberships.map(m => m.tokenNo)) + 1 : 1;
        this.addMembership({
          groupMembershipId: `gm_bulk_${now}_${index}_${Math.floor(Math.random() * 1000)}`,
          chitGroupId: item.chitGroupId,
          memberId: item.member.memberId,
          tokenNo: nextToken,
          joinedOn: new Date().toISOString().split('T')[0]
        });
      }
    });
    this.markDirty();
  }

  confirmAllotment(allotment: Allotment) {
    this.allotments.push(allotment);
    const chit = this.chits.find(c => c.chitGroupId === allotment.chitGroupId);
    if (!chit) return;
    const currentSchedule = this.installments.find(s => s.chitGroupId === allotment.chitGroupId && s.memberId === allotment.memberId && s.monthNo === allotment.monthNo);
    if (currentSchedule) currentSchedule.isPrizeMonth = true;
    this.installments.forEach(s => {
      if (s.chitGroupId === allotment.chitGroupId && s.memberId === allotment.memberId && s.monthNo > allotment.monthNo) {
        s.dueAmount = chit.monthlyInstallmentAllotted;
      }
    });
    this.markDirty();
  }

  updateAllotment(allotmentId: string, data: Partial<Allotment>) {
    const idx = this.allotments.findIndex(a => a.allotmentId === allotmentId);
    if (idx === -1) return;
    const oldAllotment = this.allotments[idx];
    const chit = this.chits.find(c => c.chitGroupId === oldAllotment.chitGroupId);
    if (!chit) return;

    this.installments.forEach(s => {
      if (s.chitGroupId === oldAllotment.chitGroupId && s.memberId === oldAllotment.memberId) {
        if (s.monthNo === oldAllotment.monthNo) s.isPrizeMonth = false;
        if (s.monthNo > oldAllotment.monthNo) s.dueAmount = chit.monthlyInstallmentRegular;
      }
    });

    this.allotments[idx] = { ...oldAllotment, ...data };
    const newAllotment = this.allotments[idx];

    this.installments.forEach(s => {
      if (s.chitGroupId === newAllotment.chitGroupId && s.memberId === newAllotment.memberId) {
        if (s.monthNo === newAllotment.monthNo) s.isPrizeMonth = true;
        if (s.monthNo > newAllotment.monthNo) s.dueAmount = chit.monthlyInstallmentAllotted;
      }
    });
    this.markDirty();
  }

  revokeAllotment(allotmentId: string) {
    const idx = this.allotments.findIndex(a => a.allotmentId === allotmentId);
    if (idx === -1) return;
    const allotment = this.allotments[idx];
    allotment.revoked = true;
    allotment.isConfirmed = false;
    const chit = this.chits.find(c => c.chitGroupId === allotment.chitGroupId);
    if (!chit) return;
    const currentSchedule = this.installments.find(s => s.chitGroupId === allotment.chitGroupId && s.memberId === allotment.memberId && s.monthNo === allotment.monthNo);
    if (currentSchedule) currentSchedule.isPrizeMonth = false;
    this.installments.forEach(s => {
      if (s.chitGroupId === allotment.chitGroupId && s.memberId === allotment.memberId && s.monthNo > allotment.monthNo) {
        s.dueAmount = chit.monthlyInstallmentRegular;
      }
    });
    this.markDirty();
  }

  addPayment(payment: Payment) {
    this.payments.push(payment);
    const schedule = this.installments.find(s => s.chitGroupId === payment.chitGroupId && s.memberId === payment.memberId && s.monthNo === payment.monthNo);
    if (schedule) {
      schedule.paidAmount += payment.paidAmount;
      schedule.paidDate = payment.paymentDate;
      schedule.status = schedule.paidAmount >= schedule.dueAmount ? PaymentStatus.PAID : PaymentStatus.PARTIAL;
    }
    this.markDirty();
  }
}

export const db = new DB();
