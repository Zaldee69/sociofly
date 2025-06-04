# 🛠️ Operational Monitoring System (Admin)

## Overview

**Operational Monitoring System** adalah dashboard khusus admin untuk memantau kesehatan sistem dan mengatasi masalah operasional dalam publishing post. Fokus pada **system reliability** dan **immediate action items**, bukan analytics performance.

## 🎯 Mengapa Operational Monitoring Diperlukan untuk Admin?

### **Admin Concerns:**

1. **System Health** - Apakah semua komponen berjalan normal?
2. **Failed Posts** - Post mana yang gagal dan butuh retry?
3. **Stuck Approvals** - Approval yang tertahan >24h dan perlu escalation
4. **Platform Connectivity** - API platform mana yang bermasalah?
5. **Immediate Actions** - Issue apa yang butuh admin intervention?

### **Bukan Admin Concern:**

- ❌ Engagement rates (tugas content team)
- ❌ Performance analytics (tugas marketing team)
- ❌ Content insights (tugas creator team)
- ❌ Business metrics (tugas management)

---

## 🚀 Admin Features

### 1. **System Health Dashboard**

- **System Status** - HEALTHY / WARNING / CRITICAL
- **Failed Posts Count** - Posts requiring immediate action
- **Stuck Approvals** - Pending >24h (need escalation)
- **Platform Connectivity** - API status per platform

### 2. **Critical System Alerts**

- 🚨 **Red Alert Banner** when issues detected
- **Failed Posts Alert** - Immediate retry buttons
- **Stuck Approvals Alert** - Escalation actions needed
- **Auto-refresh** every 2 minutes

### 3. **Operational Issues Table**

- **Filter by Issue Type** - Failed, Stuck Approvals, All Issues
- **Error Details** - Specific error messages for failed posts
- **Duration Tracking** - How long issues have been pending
- **One-Click Actions** - Retry, Escalate, Configure

### 4. **Platform Status Monitor**

- **API Connectivity** - UP / DOWN / DEGRADED status
- **Real-time Status** - Live monitoring dengan visual indicators
- **Last Check Time** - When connectivity was last verified

---

## 🛠️ Admin Actions

### **Failed Post Resolution:**

1. **Identify** - Red alert shows failed post count
2. **Diagnose** - Review error details in table
3. **Retry** - One-click retry button
4. **Monitor** - Track resolution status

### **Stuck Approval Management:**

1. **Detect** - Approvals pending >24h automatically flagged
2. **Review** - Check approval details and assignee
3. **Escalate** - Manual escalation to managers
4. **Follow-up** - Monitor resolution progress

### **Platform Issues:**

1. **Monitor** - Real-time API connectivity status
2. **Diagnose** - Check which platform is degraded/down
3. **Investigate** - Review error logs and patterns
4. **Communicate** - Notify relevant teams

---

## 📊 Admin Metrics (Operational Focus)

### **System Health Indicators:**

- **Failed Posts**: 0 = Healthy, 1-5 = Warning, >5 = Critical
- **Stuck Approvals**: <24h = Normal, >24h = Issue
- **Platform Status**: >80% success = UP, 50-80% = DEGRADED, <50% = DOWN

### **Alert Thresholds:**

- 🔴 **CRITICAL**: >5 failed posts OR any platform DOWN
- 🟡 **WARNING**: 1-5 failed posts OR platform DEGRADED
- 🟢 **HEALTHY**: 0 failed posts AND all platforms UP

---

## 🔧 Admin Workflow

### **Daily Operations:**

```
1. Check System Health (HEALTHY/WARNING/CRITICAL)
2. Review Failed Posts (if any)
   → Click retry for temporary failures
   → Investigate persistent failures
3. Check Stuck Approvals (>24h)
   → Escalate to appropriate managers
   → Follow up on resolution
4. Monitor Platform Status
   → Report degraded/down platforms
   → Coordinate with platform teams
```

### **Issue Resolution Priority:**

1. **CRITICAL** - Platform DOWN (all hands on deck)
2. **HIGH** - Multiple failed posts (immediate retry)
3. **MEDIUM** - Stuck approvals >48h (escalate)
4. **LOW** - Single failed post (retry once)

---

## 🚨 Alert Management

### **Red Alert Conditions:**

- Failed posts > 0
- Stuck approvals > 24h
- Platform connectivity DOWN

### **Auto-Actions:**

- Dashboard auto-refresh every 2 minutes
- Failed post detection within 5 minutes
- Platform status check every 10 minutes

### **Manual Actions Required:**

- Retry failed posts (admin judgment)
- Escalate stuck approvals (contact managers)
- Report platform issues (contact tech team)

---

## 📱 Admin Usage

### **Quick Daily Check (2 minutes):**

1. Open `/admin` → "Post Monitoring" tab
2. Check System Health status
3. Action any red alerts
4. Review platform connectivity

### **Issue Response (5-10 minutes):**

1. Click into specific failed posts
2. Review error messages
3. Retry or escalate as needed
4. Document recurring issues

---

## 🔐 Admin Permissions

**Access Level: Admin Only**

- View all posts across teams
- Retry failed posts
- Access error logs
- Platform connectivity data
- System health metrics

**Not Included:**

- Content performance analytics
- Business metrics
- User engagement data
- Revenue/conversion tracking

---

## 🎯 Success Criteria

### **Daily Targets:**

- ✅ Zero failed posts at end of day
- ✅ Zero stuck approvals >24h
- ✅ All platforms UP or DEGRADED (not DOWN)
- ✅ System health: HEALTHY or WARNING (not CRITICAL)

### **Response Time:**

- **Failed Posts**: <30 minutes detection, <2 hours resolution
- **Stuck Approvals**: <4 hours escalation for >24h items
- **Platform Issues**: <15 minutes detection, immediate reporting

---

**📞 Admin Support:** For escalation, contact platform teams for API issues or management for approval workflow problems.
