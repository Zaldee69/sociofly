# UI Improvements: Simplified Submit Button Experience

## Problem

Previously, the post dialog had multiple submit buttons which created confusion:

1. **PostActionSelector** - for publish/schedule/draft/request review
2. **Separate Resubmit Button** - in ApprovalStatusDisplay for rejected posts

This led to a cluttered UI and unclear user experience.

## Solution

### 🎯 **Smart Submit Button Integration**

We've integrated the resubmit functionality into the main submit button, creating a single, intelligent submit experience.

### **How It Works**

#### **For Normal Posts:**

```
[Publish Now ▼] → Shows normal actions (Publish, Schedule, Draft, Request Review)
```

#### **For Rejected Posts:**

```
[🔄 Resubmit for Review ▼] → Shows resubmit as primary + normal actions as alternatives
```

### **Implementation Details**

#### **1. Enhanced PostActionSelector**

```typescript
// Detects post rejection status
const { isRejected } = usePostApprovalStatus(postId || "");

// Shows different actions based on status
const actions = isRejected ? [resubmitAction, ...normalActions] : normalActions;
```

#### **2. Smart Submit Handler**

```typescript
// Handles resubmission for rejected posts
if (post?.id && isRejectedPost && values.postAction === PostAction.REQUEST_REVIEW) {
  // 1. Update post content
  await updatePostMutation.mutateAsync({...});

  // 2. Resubmit for approval (continues from rejection stage)
  await resubmitPostMutation.mutateAsync({
    postId: post.id,
    restartFromBeginning: false,
  });
}
```

#### **3. Simplified ApprovalStatusDisplay**

- Removed separate resubmit button
- Added helpful tip: "💡 Tip: Use the submit button below to resubmit this post for review"
- Cleaner, less cluttered interface

### **User Experience Flow**

#### **Scenario: Rejected Post**

1. **User opens rejected post**

   ```
   ❌ Rejected
   Rejection Feedback: "Fix typo in line 2"
   💡 Tip: Use the submit button below to resubmit this post for review
   ```

2. **User sees smart submit button**

   ```
   [🔄 Resubmit for Review ▼]
   ```

3. **User can choose alternative actions**

   ```
   🔄 Resubmit for Review ✓
   📤 Publish Sekarang
   📅 Jadwalkan
   📝 Simpan Sebagai Draft
   👥 Ajukan Review
   ```

4. **One-click resubmission**
   - Updates post content
   - Resubmits to rejection stage
   - Shows success notification

### **Benefits**

#### **For Users:**

- ✅ **Single Submit Button**: No confusion about which button to use
- ✅ **Context-Aware**: Button adapts to post status automatically
- ✅ **Clear Intent**: Resubmit action is prominently displayed for rejected posts
- ✅ **Flexible**: Can still choose alternative actions if needed

#### **For Developers:**

- ✅ **Cleaner Code**: Centralized submit logic
- ✅ **Better UX**: Consistent interaction patterns
- ✅ **Maintainable**: Single source of truth for submit actions
- ✅ **Extensible**: Easy to add new smart behaviors

### **Technical Components**

#### **Modified Files:**

1. `approval-status.tsx` - Removed resubmit button, added helper hook
2. `post-action-selector.tsx` - Added rejection detection and resubmit action
3. `use-post-submit.ts` - Integrated resubmit logic into main submit flow
4. `index.tsx` - Connected postId to PostActionSelector

#### **New Hook:**

```typescript
export function usePostApprovalStatus(postId: string) {
  return {
    isRejected: instance?.status === "REJECTED",
    isApproved: instance?.status === "APPROVED",
    isInProgress: instance?.status === "IN_PROGRESS",
    instance,
  };
}
```

### **Future Enhancements**

- **Smart Action Suggestions**: AI-powered recommendations based on post content
- **Batch Operations**: Resubmit multiple rejected posts at once
- **Quick Fixes**: Inline editing for common rejection reasons
- **Progress Indicators**: Visual feedback during resubmission process

---

This improvement significantly enhances the user experience by reducing cognitive load and providing a more intuitive, streamlined interface for post management.
