# React Hydration Troubleshooting Guide

Panduan untuk mengatasi React hydration errors di Next.js aplikasi.

## 🚨 Common Hydration Errors

### Error: Hydration failed because the server rendered HTML didn't match the client

**Symptoms:**

```
Error: Hydration failed because the server rendered HTML didn't match the client
This can happen if a SSR-ed Client Component used:
- A server/client branch `if (typeof window !== 'undefined')`
- Variable input such as `Date.now()` or `Math.random()`
- Date formatting in a user's locale
- External changing data without sending a snapshot
- Invalid HTML tag nesting
```

## 🔍 Root Causes & Solutions

### 1. **Invalid HTML Elements**

**Problem**: Using incorrect HTML attributes for elements

```tsx
// ❌ Invalid - div cannot have type="button"
<DropdownMenuTrigger asChild>
  <div type="button">...</div>
</DropdownMenuTrigger>
```

**Solution**: Use correct HTML elements

```tsx
// ✅ Valid - button can have type="button"
<DropdownMenuTrigger asChild>
  <button type="button">...</button>
</DropdownMenuTrigger>
```

### 2. **Client-Side State Differences**

**Problem**: State yang berbeda antara server dan client render

```tsx
// ❌ Problematic - user state might be different
export function NavUser() {
  const { user } = useUser();

  if (!user) return null; // Bisa berbeda server vs client

  return <div>{user.name}</div>;
}
```

**Solution**: Wait for client-side mounting

```tsx
// ✅ Fixed - consistent state until mounted
export function NavUser() {
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !user) {
    return null; // Consistent behavior
  }

  return <div>{user.name}</div>;
}
```

### 3. **External Data Without Snapshot**

**Problem**: Data yang berubah tanpa snapshot

```tsx
// ❌ Problematic - teams data might differ
export function TeamSwitcher() {
  const { data: teams } = trpc.team.getAllTeams.useQuery();

  return (
    <div>{teams?.map((team) => <div key={team.id}>{team.name}</div>)}</div>
  );
}
```

**Solution**: Guard with mounting state

```tsx
// ✅ Fixed - prevent hydration mismatch
export function TeamSwitcher() {
  const [isMounted, setIsMounted] = useState(false);
  const { data: teams } = trpc.team.getAllTeams.useQuery();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div>Loading...</div>; // Consistent fallback
  }

  return (
    <div>{teams?.map((team) => <div key={team.id}>{team.name}</div>)}</div>
  );
}
```

### 4. **Dynamic Content**

**Problem**: Content yang berubah setiap render

```tsx
// ❌ Problematic - different every time
function RandomComponent() {
  return <div>{Math.random()}</div>;
}
```

**Solution**: Use client-side only rendering

```tsx
// ✅ Fixed - consistent until mounted
function RandomComponent() {
  const [random, setRandom] = useState<number | null>(null);

  useEffect(() => {
    setRandom(Math.random());
  }, []);

  if (random === null) {
    return <div>...</div>; // Loading placeholder
  }

  return <div>{random}</div>;
}
```

## 🛠️ Debugging Techniques

### 1. **Identify Problematic Components**

```bash
# Look for components in error stack trace
# Focus on:
# - DropdownMenu components
# - Components with external data
# - Components with conditional rendering
```

### 2. **Check HTML Validity**

```bash
# Use browser dev tools
# 1. Open Network tab
# 2. Reload page
# 3. Check initial HTML document
# 4. Look for invalid HTML attributes
```

### 3. **Log Server vs Client State**

```tsx
// Add logging to compare states
useEffect(() => {
  console.log("Client state:", { user, teams, currentTeamId });
}, []);

// Server-side (if needed)
console.log("Server state:", { user, teams, currentTeamId });
```

## 🔧 Common Fixes

### Fix 1: Element Type Correction

```tsx
// Before
<DropdownMenuTrigger asChild>
  <div className="...">Content</div>
</DropdownMenuTrigger>

// After
<DropdownMenuTrigger asChild>
  <button className="...">Content</button>
</DropdownMenuTrigger>
```

### Fix 2: Client-Side Mounting Guard

```tsx
// Before
export function Component() {
  const { data } = useQuery();

  return <div>{data?.value}</div>;
}

// After
export function Component() {
  const [isMounted, setIsMounted] = useState(false);
  const { data } = useQuery();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div>Loading...</div>;
  }

  return <div>{data?.value}</div>;
}
```

### Fix 3: Suppress Hydration Warning (Last Resort)

```tsx
// Only use when other fixes aren't possible
<div suppressHydrationWarning>{dynamicContent}</div>
```

## 🚨 Emergency Debugging

### Quick Diagnostic Commands

```bash
# 1. Check browser console for hydration errors
# 2. Look at Network tab for initial HTML
# 3. Compare server HTML vs client rendered HTML
# 4. Identify mismatched elements
```

### Temporary Workaround

```tsx
// Disable SSR for problematic component
import dynamic from "next/dynamic";

const ProblematicComponent = dynamic(() => import("./ProblematicComponent"), {
  ssr: false,
});
```

## ⚠️ Prevention Best Practices

### 1. **Consistent Rendering**

- Ensure server and client render same initial state
- Use loading states for external data
- Avoid client-only state in initial render

### 2. **Valid HTML Structure**

- Use correct HTML elements for their purpose
- Don't mix div/span with button attributes
- Validate HTML structure

### 3. **External Data Handling**

- Always guard external data with loading states
- Use proper error boundaries
- Implement proper fallbacks

### 4. **Testing**

```bash
# Test both SSR and client-side rendering
npm run build
npm start

# Check for hydration warnings in console
# Test with JavaScript disabled
# Test with slow network
```

## 📚 Related Documentation

- [React Hydration Documentation](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Next.js SSR Troubleshooting](https://nextjs.org/docs/messages/react-hydration-error)
- [UI Component Documentation](../features/UI_IMPROVEMENTS.md)

---

**Last Updated**: December 2024  
**Status**: Active Issue Resolution  
**Hydration Issues**: Fixed
