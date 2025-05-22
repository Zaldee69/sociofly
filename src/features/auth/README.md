# Authentication Feature

This directory contains all authentication related code for the application.

## Structure

```
auth/
├── components/    # Authentication UI components
├── hooks/         # Authentication related hooks
├── api/           # Authentication API routes
└── utils/         # Authentication utility functions
```

## Components

Authentication related components include:

- Login forms
- Registration forms
- Password reset flows
- Email verification
- OAuth provider buttons

## Hooks

Hooks for authentication:

- `useAuth` - Access current user and authentication state
- `useUser` - Access current user data
- `usePermissions` - Check user permissions

## Utils

Authentication utility functions:

- Token management
- Authentication helpers
- Permission checks

## API

API routes for authentication:

- Sign in
- Sign up
- Email verification
- Password reset

## Usage

Example of using authentication in a component:

```tsx
import { useAuth } from "~/features/auth/hooks/useAuth";
import { LoginForm } from "~/features/auth/components/LoginForm";

export default function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```
