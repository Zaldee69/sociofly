# Development Documentation

Dokumentasi untuk development practices, struktur file, dan tools.

## 📋 Daftar Dokumentasi

### 🔧 Development Practices

- **[Best Practices](best-practices.md)** - Coding standards dan development guidelines
- **[Migration Scripts](migration-scripts.md)** - Database migration dan data management
- **[File Structure](file-restructure-plan.md)** - Recommended file organization
- **[Import Fixes](import-fixes.md)** - Import path corrections dan module management
- **[Restructure Report](restructure-report.md)** - Project restructuring analysis

## 🏗️ Development Environment

### Prerequisites

```bash
Node.js 18+
npm atau yarn
PostgreSQL 14+
Redis 7.0+
Git
```

### Development Setup

```bash
# Clone repository
git clone <repository-url>
cd my-scheduler-app

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Configure your .env file

# Setup database
npm run db:push

# Start development server
npm run dev
```

### Development Modes

```bash
# Basic development
npm run dev

# With cron jobs
npm run dev:cron

# Full cluster mode
npm run dev:cluster

# Auto-restart with cron
npm run dev:auto
```

## 📁 Recommended File Structure

```
my-scheduler-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (pages)/           # Public pages
│   │   ├── admin/             # Admin pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Auth endpoints
│   │   │   ├── trpc/          # tRPC endpoints
│   │   │   ├── queue-manager/ # Queue management API
│   │   │   ├── monitoring/    # Monitoring API
│   │   │   └── cron-manager/  # Cron management API
│   │   └── dashboard/         # Dashboard pages
│   ├── components/            # React components
│   │   ├── ui/               # UI components (shadcn/ui)
│   │   ├── dashboard/        # Dashboard components
│   │   ├── scheduling/       # Scheduling components
│   │   ├── social/           # Social media components
│   │   └── layout/           # Layout components
│   ├── lib/                  # Library code
│   │   ├── queue/            # Queue management (BullMQ)
│   │   ├── monitoring/       # System monitoring
│   │   ├── scaling/          # Auto-scaling
│   │   ├── services/         # Business logic services
│   │   ├── utils/            # Utility functions
│   │   └── validations/      # Validation schemas
│   ├── features/             # Feature-specific code
│   │   ├── auth/             # Authentication
│   │   ├── scheduling/       # Scheduling features
│   │   ├── social/           # Social media integration
│   │   └── approval/         # Approval workflow
│   ├── server/               # Server-side code
│   │   ├── api/              # API logic
│   │   ├── auth/             # Auth utilities
│   │   └── permissions/      # Permission system
│   └── types/                # TypeScript type definitions
├── docs/                     # Documentation
│   ├── infrastructure/       # Infrastructure docs
│   ├── operations/           # Operations docs
│   ├── features/             # Feature docs
│   ├── development/          # Development docs
│   └── troubleshooting/      # Troubleshooting docs
├── scripts/                  # Utility scripts
│   ├── setup-redis-cluster.sh
│   ├── test-cluster.ts
│   └── monitor-queues.js
└── prisma/                   # Database schema
    ├── migrations/
    └── schema.prisma
```

## 🔧 Development Tools

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npx tsc --noEmit

# Testing
npm test
npm run test:cron
npm run test:bullmq
npm run test:cluster
```

### Database Management

```bash
# Prisma commands
npm run db:push      # Push schema changes
npm run db:studio    # Open Prisma Studio
npx prisma migrate dev   # Create migration
npx prisma generate      # Generate client
```

### Development Scripts

```bash
# Seed data
npm run seed:hashtags
npm run seed:permissions

# Testing specific components
npm run test:integration
npm run cron:restart
npm run queue:init
```

## 📝 Coding Standards

### TypeScript Guidelines

```typescript
// Use strict typing
interface UserData {
  id: string;
  email: string;
  createdAt: Date;
}

// Use enums for constants
enum UserRole {
  OWNER = "OWNER",
  MANAGER = "MANAGER",
  CONTENT_CREATOR = "CONTENT_CREATOR",
}

// Use proper error handling
async function fetchUser(id: string): Promise<UserData | null> {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    return user;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return null;
  }
}
```

### React Component Guidelines

```typescript
// Use functional components with hooks
import { useState, useEffect } from "react";

interface Props {
  userId: string;
  onUpdate?: (user: UserData) => void;
}

export function UserProfile({ userId, onUpdate }: Props) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user data
  }, [userId]);

  return (
    <div className="user-profile">
      {/* Component JSX */}
    </div>
  );
}
```

### API Route Guidelines

```typescript
// Use proper error handling dan validation
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  userId: z.string(),
  action: z.enum(["create", "update", "delete"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = requestSchema.parse(body);

    // Process request
    const result = await processUserAction(validatedData);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

## 🧪 Testing Strategy

### Unit Tests

```typescript
// Use Vitest for unit testing
import { describe, it, expect } from "vitest";
import { calculateLoadFactor } from "@/lib/scaling/utils";

describe("calculateLoadFactor", () => {
  it("should calculate load factor correctly", () => {
    const result = calculateLoadFactor(10, 5, 2);
    expect(result).toBe(1.0);
  });

  it("should handle zero workers", () => {
    const result = calculateLoadFactor(10, 5, 0);
    expect(result).toBe(0);
  });
});
```

### Integration Tests

```typescript
// Test API endpoints
import { describe, it, expect, beforeAll } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import handler from "@/app/api/monitoring/route";

describe("/api/monitoring", () => {
  it("should return system health", async () => {
    await testApiHandler({
      handler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "GET",
          url: "?action=health_check&apiKey=test-key",
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
      },
    });
  });
});
```

## 🔄 Git Workflow

### Branch Naming

```bash
# Feature development
feature/approval-workflow-improvements
feature/redis-cluster-setup

# Bug fixes
fix/cron-job-timezone-issue
fix/queue-memory-leak

# Infrastructure
infra/monitoring-system
infra/auto-scaling-implementation
```

### Commit Messages

```bash
# Follow conventional commits
feat: add Redis cluster support with automatic failover
fix: resolve cron job timezone handling issue
docs: update API documentation for monitoring endpoints
refactor: reorganize queue management structure
test: add integration tests for auto-scaling system
```

### Pull Request Process

1. Create feature branch dari `main`
2. Implement changes dengan tests
3. Update documentation jika diperlukan
4. Run linting dan tests
5. Create PR dengan descriptive title
6. Request code review
7. Address feedback dan merge

## 🛠️ Debugging Tools

### Development Debugging

```bash
# Debug mode
DEBUG=* npm run dev

# Inspect Node.js process
node --inspect app.js
# Open chrome://inspect in Chrome

# Monitor Redis
redis-cli monitor

# Monitor queues
npm run queue:monitor

# Check system health
npm run monitor:health
```

### Performance Profiling

```bash
# Profile Node.js application
node --prof app.js
node --prof-process isolate-*.log

# Monitor memory usage
node --inspect app.js
# Use Chrome DevTools Memory tab

# Database query profiling
# Enable Prisma query logging
DEBUG="prisma:query" npm run dev
```

## 📦 Package Management

### Dependency Guidelines

```json
{
  "dependencies": {
    // Production dependencies only
    "next": "15.3.0",
    "react": "^19.0.0",
    "bullmq": "^5.53.2",
    "ioredis": "^5.6.1"
  },
  "devDependencies": {
    // Development dan testing tools
    "@types/node": "^20",
    "typescript": "^5",
    "vitest": "^3.1.2"
  }
}
```

### Updating Dependencies

```bash
# Check outdated packages
npm outdated

# Update packages
npm update

# Major version updates (careful!)
npm install package@latest

# Security audit
npm audit
npm audit fix
```

## 🔧 Environment Configuration

### Development Environment

```bash
# Development specific
NODE_ENV=development
NEXT_PUBLIC_DEV_MODE=true
DEBUG=app:*

# Database
DATABASE_URL="postgresql://localhost:5432/scheduler_dev"

# Redis (local)
REDIS_HOST=localhost
REDIS_PORT=6379

# Enable development features
ENABLE_CRON_JOBS=true
ENABLE_SYSTEM_MONITORING=true
```

### Production Environment

```bash
# Production specific
NODE_ENV=production
NEXT_PUBLIC_DEV_MODE=false

# Database (secure)
DATABASE_URL="postgresql://user:pass@host:5432/scheduler_prod"

# Redis cluster
REDIS_USE_CLUSTER=true
REDIS_CLUSTER_HOST_1=redis-1.production.com

# Security
CRON_API_KEY=secure-random-key
CLERK_SECRET_KEY=secure-clerk-key
```

## 📚 Resources

### Internal Documentation

- [Infrastructure Guide](../infrastructure/) - System architecture
- [Operations Guide](../operations/) - Monitoring dan deployment
- [Features Guide](../features/) - Business logic dan features
- [Troubleshooting](../troubleshooting/) - Issue resolution

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)

---

**Development Status**: Active  
**Code Quality**: High Standards  
**Last Updated**: December 2024
