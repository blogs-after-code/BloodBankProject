const DB = {
  donors: {
    async getAll() {
      const snapshot = await db.collection('donors').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async add(donor) {
      donor.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      donor.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection('donors').add(donor);
      await DB.audit.log('donor_added', `Added donor: ${donor.name}`);
      return ref.id;
    },
    async update(id, data) {
      data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('donors').doc(id).update(data);
      await DB.audit.log('donor_updated', `Updated donor: ${id}`);
    },
    async delete(id) {
      await db.collection('donors').doc(id).delete();
      await DB.audit.log('donor_deleted', `Deleted donor: ${id}`);
    },
    async search(query) {
      const all = await this.getAll();
      const q = query.toLowerCase();
      return all.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.bloodGroup?.toLowerCase().includes(q) ||
        d.phone?.includes(q) ||
        d.email?.toLowerCase().includes(q)
      );
    },
    async getByBloodGroup(group) {
      const snapshot = await db.collection('donors')
        .where('bloodGroup', '==', group).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async getCount() {
      const snapshot = await db.collection('donors').get();
      return snapshot.size;
    }
  },

  inventory: {
    async getAll() {
      const snapshot = await db.collection('inventoryBatches')
        .orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async add(batch) {
      batch.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      batch.status = 'available';
      const ref = await db.collection('inventoryBatches').add(batch);
      await DB.audit.log('inventory_added', `Added ${batch.units} units of ${batch.bloodGroup}`);
      return ref.id;
    },
    async update(id, data) {
      data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('inventoryBatches').doc(id).update(data);
    },
    async delete(id) {
      await db.collection('inventoryBatches').doc(id).delete();
      await DB.audit.log('inventory_deleted', `Removed batch: ${id}`);
    },
    async getSummary() {
      const batches = await this.getAll();
      const summary = {};
      const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      groups.forEach(g => summary[g] = { total: 0, available: 0, expiringSoon: 0 });

      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      batches.forEach(b => {
        if (summary[b.bloodGroup] !== undefined && b.status === 'available') {
          summary[b.bloodGroup].total += b.units || 0;
          summary[b.bloodGroup].available += b.units || 0;
          if (b.expiryDate) {
            const exp = b.expiryDate.toDate ? b.expiryDate.toDate() : new Date(b.expiryDate);
            if (exp <= sevenDays) summary[b.bloodGroup].expiringSoon += b.units || 0;
          }
        }
      });
      return summary;
    },
    async getTotalUnits() {
      const summary = await this.getSummary();
      return Object.values(summary).reduce((sum, g) => sum + g.available, 0);
    }
  },

  requests: {
    async getAll() {
      const snapshot = await db.collection('bloodRequests')
        .orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async add(request) {
      request.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      request.status = 'pending';
      const ref = await db.collection('bloodRequests').add(request);
      await DB.audit.log('request_created', `New blood request from ${request.hospitalName}`);
      return ref.id;
    },
    async updateStatus(id, status) {
      await db.collection('bloodRequests').doc(id).update({
        status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await DB.audit.log('request_status', `Request ${id} → ${status}`);
    },
    async delete(id) {
      await db.collection('bloodRequests').doc(id).delete();
    },
    async getActive() {
      const snapshot = await db.collection('bloodRequests')
        .where('status', 'in', ['pending', 'approved', 'matched']).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async getActiveCount() {
      const active = await this.getActive();
      return active.length;
    }
  },

  camps: {
    async getAll() {
      const snapshot = await db.collection('donationCamps')
        .orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async add(camp) {
      camp.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      camp.registeredDonors = 0;
      const ref = await db.collection('donationCamps').add(camp);
      await DB.audit.log('camp_created', `New camp: ${camp.name}`);
      return ref.id;
    },
    async update(id, data) {
      data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('donationCamps').doc(id).update(data);
    },
    async delete(id) {
      await db.collection('donationCamps').doc(id).delete();
    },
    async getUpcoming() {
      const now = new Date();
      const all = await this.getAll();
      return all.filter(c => {
        const campDate = c.date?.toDate ? c.date.toDate() : new Date(c.date);
        return campDate >= now;
      });
    },
    async getUpcomingCount() {
      const upcoming = await this.getUpcoming();
      return upcoming.length;
    }
  },

  notifications: {
    async getAll() {
      const snapshot = await db.collection('notifications')
        .orderBy('createdAt', 'desc').limit(20).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async add(notification) {
      notification.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      notification.read = false;
      return db.collection('notifications').add(notification);
    },
    async markRead(id) {
      await db.collection('notifications').doc(id).update({ read: true });
    }
  },

  audit: {
    async log(action, details) {
      const user = auth.currentUser;
      await db.collection('auditLogs').add({
        action,
        details,
        userId: user?.uid || 'system',
        userEmail: user?.email || 'system',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    },
    async getRecent(limit = 10) {
      const snapshot = await db.collection('auditLogs')
        .orderBy('timestamp', 'desc').limit(limit).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  },

  users: {
    async createProfile(uid, data) {
      await db.collection('users').doc(uid).set({
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    },
    async getProfile(uid) {
      const doc = await db.collection('users').doc(uid).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },
    async updateProfile(uid, data) {
      await db.collection('users').doc(uid).update(data);
    }
  }
};

const DemoData = {
  async seed() {
    console.log('Seeding demo data...');

    const donors = [
      { name: 'Aarav Sharma', bloodGroup: 'O+', phone: '9876543210', email: 'aarav@email.com', age: 28, gender: 'Male', city: 'Delhi', lastDonation: '2025-12-15', available: true },
      { name: 'Priya Patel', bloodGroup: 'A+', phone: '9876543211', email: 'priya@email.com', age: 25, gender: 'Female', city: 'Mumbai', lastDonation: '2025-11-20', available: true },
      { name: 'Rahul Verma', bloodGroup: 'B+', phone: '9876543212', email: 'rahul@email.com', age: 32, gender: 'Male', city: 'Bangalore', lastDonation: '2026-01-10', available: false },
      { name: 'Ananya Gupta', bloodGroup: 'AB+', phone: '9876543213', email: 'ananya@email.com', age: 22, gender: 'Female', city: 'Kolkata', lastDonation: '2025-10-05', available: true },
      { name: 'Vikram Singh', bloodGroup: 'O-', phone: '9876543214', email: 'vikram@email.com', age: 35, gender: 'Male', city: 'Chennai', lastDonation: '2026-02-01', available: true },
      { name: 'Sneha Reddy', bloodGroup: 'A-', phone: '9876543215', email: 'sneha@email.com', age: 29, gender: 'Female', city: 'Hyderabad', lastDonation: '2025-09-18', available: true },
    ];

    for (const d of donors) {
      d.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      d.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('donors').add(d);
    }

    const inventory = [
      { bloodGroup: 'O+', units: 24, source: 'Camp Drive', collectedDate: '2026-02-10', expiryDate: '2026-04-10', status: 'available' },
      { bloodGroup: 'A+', units: 18, source: 'Walk-in', collectedDate: '2026-02-15', expiryDate: '2026-04-15', status: 'available' },
      { bloodGroup: 'B+', units: 12, source: 'Camp Drive', collectedDate: '2026-01-20', expiryDate: '2026-03-20', status: 'available' },
      { bloodGroup: 'AB+', units: 5, source: 'Walk-in', collectedDate: '2026-02-01', expiryDate: '2026-04-01', status: 'available' },
      { bloodGroup: 'O-', units: 3, source: 'Emergency Donor', collectedDate: '2026-03-01', expiryDate: '2026-05-01', status: 'available' },
      { bloodGroup: 'A-', units: 2, source: 'Walk-in', collectedDate: '2026-03-05', expiryDate: '2026-05-05', status: 'available' },
      { bloodGroup: 'B-', units: 4, source: 'Camp Drive', collectedDate: '2026-02-20', expiryDate: '2026-04-20', status: 'available' },
      { bloodGroup: 'AB-', units: 1, source: 'Walk-in', collectedDate: '2026-03-10', expiryDate: '2026-03-25', status: 'available' },
    ];

    for (const b of inventory) {
      b.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('inventoryBatches').add(b);
    }

    const requests = [
      { hospitalName: 'AIIMS Delhi', bloodGroup: 'O-', unitsNeeded: 4, urgency: 'critical', patientName: 'Patient A', contactPerson: 'Dr. Mehta', contactPhone: '9111222333', status: 'pending', notes: 'Emergency surgery' },
      { hospitalName: 'Apollo Mumbai', bloodGroup: 'A+', unitsNeeded: 2, urgency: 'high', patientName: 'Patient B', contactPerson: 'Dr. Shah', contactPhone: '9222333444', status: 'approved', notes: 'Scheduled transfusion' },
      { hospitalName: 'Fortis Bangalore', bloodGroup: 'B+', unitsNeeded: 3, urgency: 'normal', patientName: 'Patient C', contactPerson: 'Dr. Rao', contactPhone: '9333444555', status: 'completed', notes: '' },
    ];

    for (const r of requests) {
      r.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('bloodRequests').add(r);
    }

    const camps = [
      { name: 'Republic Day Blood Drive', organizer: 'Red Cross Delhi', location: 'India Gate Grounds, Delhi', date: '2026-04-15', expectedDonors: 100, registeredDonors: 67, status: 'upcoming', contactPhone: '9444555666' },
      { name: 'University Health Camp', organizer: 'College Med Society', location: 'IIT Campus, Mumbai', date: '2026-05-01', expectedDonors: 50, registeredDonors: 12, status: 'upcoming', contactPhone: '9555666777' },
      { name: 'Community Blood Fest', organizer: 'Lions Club', location: 'City Hall, Kolkata', date: '2026-02-14', expectedDonors: 80, registeredDonors: 80, status: 'completed', contactPhone: '9666777888' },
    ];

    for (const c of camps) {
      c.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('donationCamps').add(c);
    }

    console.log('Demo data seeded successfully!');
    showToast('Demo data loaded successfully', 'success');
  },

  async clearAll() {
    const collections = ['donors', 'inventoryBatches', 'bloodRequests', 'donationCamps', 'notifications', 'auditLogs'];
    for (const col of collections) {
      const snapshot = await db.collection(col).get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    console.log('All data cleared');
  }
};