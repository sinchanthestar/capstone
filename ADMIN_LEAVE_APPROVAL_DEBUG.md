# Admin Leave Request Approval - Debugging Guide

## ✅ Status: All Checks Passed

Database structure, API endpoints, and approval logic are all functioning correctly.

## 🔧 Recent Improvements

### 1. **Better Error Handling in API**
- Added detailed error logging with step tracking
- Approve endpoint (`/api/admin/leave-requests/approve`):
  - Logs each step of the approval process
  - Returns clear error messages with step information
  - Better validation of all inputs
  
- Reject endpoint (`/api/admin/leave-requests/reject`):
  - Similar improvements with step tracking
  - Better error reporting

### 2. **Improved Frontend Error Handling**
- Added detailed logging in admin component
- Console logs show:
  - Request payload
  - Response status
  - Response content
  - Parsing errors (if any)
- Better user-facing error messages

### 3. **Database Schema Verification**
- `schedule_assignments` table has all required columns:
  - `status` - Assignment status (ACTIVE, REPLACED, etc.)
  - `replaced_by_employee_id` - Employee replacing this assignment
  - `replacement_for_id` - Reference to original assignment
- All foreign keys properly configured

## 🐛 Troubleshooting

If "Setujui & Tugaskan" button still doesn't work:

### Step 1: Open Browser DevTools
- Press `F12` to open Developer Tools
- Go to **Console** tab

### Step 2: Click "Setujui & Tugaskan" Button
- You should see console messages starting with `[Admin LeaveRequests]`

### Step 3: Look for These Messages:

**Expected (Success):**
```
[Admin LeaveRequests] Approving leave request: {...}
[Admin LeaveRequests] Approval response status: 200
[Admin LeaveRequests] Approval response text: {"message":"Pengajuan izin disetujui..."}
```

**If Error (Example):**
```
[Admin LeaveRequests] Approval response status: 400
[Admin LeaveRequests] Approval response text: {"error":"Karyawan pengganti sudah memiliki jadwal..."}
```

### Step 4: Common Errors & Solutions

| Error Message | Cause | Solution |
|---|---|---|
| "Tidak ada respons dari server" | Server returned invalid JSON | Refresh browser and try again |
| "Karyawan pengganti sudah memiliki jadwal di tanggal tersebut" | Replacement has conflict | Choose different replacement |
| "Karyawan pengganti tidak ditemukan" | Invalid employee ID | Reload page and try again |
| "Pengajuan ini sudah diproses" | Already approved/rejected | Check leave request status |

## 📊 API Endpoints

### Approve Leave Request
```
POST /api/admin/leave-requests/approve

Request Body:
{
  "leaveRequestId": "uuid",
  "replacementEmployeeId": "uuid",
  "adminNotes": "optional notes"
}

Success Response (200):
{
  "message": "Pengajuan izin disetujui dan pengganti telah ditugaskan",
  "newAssignmentId": "uuid"
}

Error Response (400, 404, 500):
{
  "error": "descriptive error message",
  "step": "which step failed (for debugging)"
}
```

### Reject Leave Request
```
POST /api/admin/leave-requests/reject

Request Body:
{
  "leaveRequestId": "uuid",
  "adminNotes": "optional reason"
}

Success Response (200):
{
  "message": "Pengajuan izin ditolak"
}
```

### Get Available Replacements
```
GET /api/admin/available-replacements?date=2026-02-17&excludeEmployeeId=uuid

Response (200):
{
  "availableEmployees": [
    {
      "id": "uuid",
      "full_name": "name",
      "email": "email",
      "department": "dept",
      "position": "pos"
    }
  ],
  "date": "2026-02-17"
}
```

## 🧪 Testing Commands

Run these in the terminal to verify everything:

```bash
# Test approval flow
node test-approval-e2e.js

# Test database schema
node test-approval-flow.js

# Test leave requests API (if exists)
node test-leave-api.js
```

## 📝 Database Tables

### leave_requests
- `id` (UUID)
- `employee_id` (UUID) - Employee requesting leave
- `assignment_id` (UUID) - Schedule assignment to replace
- `reason` (TEXT)
- `status` (VARCHAR) - PENDING, APPROVED, REJECTED
- `admin_notes` (TEXT) - Admin's decision notes
- `approved_by` (UUID) - Admin who approved/rejected
- `created_at`, `updated_at` (TIMESTAMP)

### schedule_assignments
- `id` (UUID)
- `employee_id` (UUID) - Original assigned employee
- `shift_id` (UUID)
- `scheduled_date` (DATE)
- `status` (VARCHAR) - ACTIVE, REPLACED
- `replaced_by_employee_id` (UUID) - Replacement employee
- `replacement_for_id` (UUID) - Original assignment reference
- Other columns: `is_confirmed`, `notes`, `created_at`, `updated_at`

## ✨ What Was Fixed

1. ✅ Leave request table migration (column mismatch fixed)
2. ✅ API error handling (now returns meaningful errors)
3. ✅ Frontend logging (easier debugging in browser)
4. ✅ Database constraints (all FKs properly configured)
5. ✅ Validation logic (step-by-step checks)

## 🚀 Next Steps if Still Not Working

1. Check browser console for exact error message
2. Run test scripts to verify database
3. Share the exact error from console logs
4. Check if server is running (`pnpm dev`)
5. Verify admin user has correct role
