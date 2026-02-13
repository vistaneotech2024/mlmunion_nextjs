/**
 * Helper script to copy components and add 'use client' directive where needed
 * Run: node scripts/migrate-components.js
 */

const fs = require('fs')
const path = require('path')

const srcDir = path.join(__dirname, '../../src')
const destDir = path.join(__dirname, '../components')

// Patterns that indicate client-side code
const clientPatterns = [
  /useState|useEffect|useContext|useCallback|useMemo|useRef/,
  /window\.|document\.|localStorage|sessionStorage/,
  /onClick|onChange|onSubmit/,
  /useRouter|usePathname|useSearchParams/,
  /useAuth|useSidebar/,
]

function needsClientDirective(content) {
  return clientPatterns.some(pattern => pattern.test(content))
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath)
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      let content = fs.readFileSync(srcPath, 'utf8')
      
      // Check if already has 'use client'
      if (!content.includes("'use client'") && !content.includes('"use client"')) {
        if (needsClientDirective(content)) {
          // Add 'use client' at the top
          content = "'use client'\n\n" + content
        }
      }
      
      // Update imports
      content = content.replace(/from ['"]\.\.\/lib\/supabase['"]/g, "from '@/lib/supabase/client'")
      content = content.replace(/from ['"]\.\.\/\.\.\/lib\/supabase['"]/g, "from '@/lib/supabase/client'")
      content = content.replace(/from ['"]react-router-dom['"]/g, "from 'next/navigation'")
      content = content.replace(/import \{ Link \} from ['"]react-router-dom['"]/g, "import Link from 'next/link'")
      content = content.replace(/import \{ useNavigate \} from ['"]react-router-dom['"]/g, "import { useRouter } from 'next/navigation'")
      content = content.replace(/const navigate = useNavigate\(\)/g, 'const router = useRouter()')
      content = content.replace(/navigate\((['"]\/[^'"]+['"])\)/g, "router.push($1)")
      
      fs.writeFileSync(destPath, content, 'utf8')
      console.log(`✅ Copied and updated: ${entry.name}`)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

console.log('🚀 Starting component migration...')
console.log(`Source: ${srcDir}`)
console.log(`Destination: ${destDir}`)

if (!fs.existsSync(srcDir)) {
  console.error(`❌ Source directory not found: ${srcDir}`)
  process.exit(1)
}

copyDirectory(path.join(srcDir, 'components'), destDir)
console.log('✅ Component migration complete!')
console.log('\n⚠️  Please review the migrated files and:')
console.log('   1. Check that all imports are correct')
console.log('   2. Verify client/server component boundaries')
console.log('   3. Update any remaining React Router imports')

