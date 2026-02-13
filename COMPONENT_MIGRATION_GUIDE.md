# Component Migration Guide - Quick Copy/Paste Method

This guide provides a simple step-by-step process to migrate React Router components to Next.js.

## Quick Migration Checklist

### Step 1: Copy the Component File
```bash
# Copy from src/components to NextJsMigration/components
# Copy from src/pages to NextJsMigration/components/pages
```

### Step 2: Update Imports (Find & Replace)

#### Navigation Hooks
```typescript
// OLD (React Router)
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

// NEW (Next.js)
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
```

#### Navigation Usage
```typescript
// OLD
const navigate = useNavigate();
const location = useLocation();
navigate('/path');
<Link to="/path">Link</Link>

// NEW
const router = useRouter();
const pathname = usePathname();
router.push('/path');
<Link href="/path">Link</Link>
```

#### Import Paths
```typescript
// OLD (Relative paths)
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// NEW (Alias paths)
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
```

### Step 3: Add 'use client' Directive
Add at the very top of client components:
```typescript
'use client'

import React from 'react';
// ... rest of imports
```

### Step 4: Fix Table Names (Supabase)
```typescript
// Common table name fixes:
.from('companies') → .from('mlm_companies')
// Check other tables if needed
```

### Step 5: Remove React Helmet (if present)
```typescript
// OLD
import { Helmet } from 'react-helmet-async';
<Helmet>
  <title>Page Title</title>
</Helmet>

// NEW - Use Next.js metadata in page.tsx instead
// See page.tsx examples below
```

## Component Types

### Client Component (Interactive)
- Uses hooks (useState, useEffect, etc.)
- Has event handlers
- Uses browser APIs
- **Must have**: `'use client'` directive

### Server Component (Static)
- No hooks
- No event handlers
- Can fetch data directly
- **No** `'use client'` directive

## Page Structure Pattern

### For Public Pages (companies, blog, news, etc.)

**1. Create `app/[route]/page.tsx`** (Server Component):
```typescript
import { Metadata } from 'next';
import { PageContent } from '@/components/pages/PageContent';

export const metadata: Metadata = {
  title: 'Page Title | MLM Union',
  description: 'Page description',
  keywords: 'keyword1, keyword2',
  openGraph: {
    title: 'Page Title',
    description: 'Page description',
    type: 'website',
  },
};

export default function Page() {
  return <PageContent />;
}
```

**2. Create `components/pages/PageContent.tsx`** (Client Component):
```typescript
'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
// ... other imports

export function PageContent() {
  const router = useRouter();
  // ... component logic
}
```

## Common Find & Replace Patterns

### Pattern 1: Navigation
```
Find: navigate\(['"](.*?)['"]\)
Replace: router.push('$1')
```

### Pattern 2: Link Components
```
Find: <Link to=
Replace: <Link href=
```

### Pattern 3: Import Paths
```
Find: from ['"]\.\./
Replace: from '@/components/
```

### Pattern 4: useLocation
```
Find: const location = useLocation\(\);
Find: location\.pathname
Replace: const pathname = usePathname();
Replace: pathname
```

## Automated Migration Script

You can use this PowerShell script to batch update imports:

```powershell
# Update navigation imports
Get-ChildItem -Path "NextJsMigration\components" -Recurse -Filter "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "from 'react-router-dom'", "from 'next/navigation'"
    $content = $content -replace "import.*Link.*from 'react-router-dom'", "import Link from 'next/link'"
    Set-Content $_.FullName -Value $content
}
```

## Testing Checklist

After migration, test:
- [ ] Page loads without errors
- [ ] Navigation works (router.push)
- [ ] Links work (href)
- [ ] Search params work (useSearchParams)
- [ ] Data fetching works (Supabase queries)
- [ ] No console errors

## Common Issues & Fixes

### Issue: "useLocation is not a function"
**Fix**: Replace `useLocation()` with `usePathname()` from `next/navigation`

### Issue: "Table not found"
**Fix**: Check table name - use `mlm_companies` instead of `companies`

### Issue: "Link href expects string"
**Fix**: Ensure all `Link` components use `href` prop, not `to`

### Issue: "Cannot use hooks in server component"
**Fix**: Add `'use client'` directive at top of file

## Quick Reference

| React Router | Next.js |
|-------------|---------|
| `useNavigate()` | `useRouter()` |
| `useLocation()` | `usePathname()` |
| `useSearchParams()` | `useSearchParams()` (from next/navigation) |
| `<Link to="">` | `<Link href="">` |
| `navigate('/path')` | `router.push('/path')` |
| `location.pathname` | `pathname` |

