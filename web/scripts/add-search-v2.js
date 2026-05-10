const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/admin/ManageContent.tsx');
let content = fs.readFileSync(file, 'utf8');

// Check if search input already exists
if (content.includes('Search size={14}')) {
  console.log('Search input already exists');
  process.exit(0);
}

// Use simple string replacement - insert search before image filter
const before = '                        <select\n                            value={imageFilter}';
const after = `                        {/* Search */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search posts..."
                                className="bg-[#0F0E0D] border border-[#2F2A26] rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#C5A059] w-44"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <select
                            value={imageFilter}`;

content = content.replace(before, after);

// Add Search and X to imports
content = content.replace(
  "import { Loader2, Trash2, Edit, RotateCcw, AlertOctagon, ChevronDown, Filter } from 'lucide-react';",
  "import { Loader2, Trash2, Edit, RotateCcw, AlertOctagon, ChevronDown, Filter, Search, X } from 'lucide-react';"
);

// Add search state
content = content.replace(
  "const [categoryFilter, setCategoryFilter] = useState<string>('all');",
  "const [categoryFilter, setCategoryFilter] = useState<string>('all');\n  const [searchQuery, setSearchQuery] = useState('');"
);

// Add search filter in sortedPosts
content = content.replace(
  'return [...filteredPosts]\n            .filter((post) => {\n                if (imageFilter',
  `return [...filteredPosts]
            .filter((post) => {
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  return (
                    post.title?.toLowerCase().includes(q) ||
                    post.category?.toLowerCase().includes(q) ||
                    post.subCategory?.toLowerCase().includes(q)
                  );
                }
                return true;
            })
            .filter((post) => {
                if (imageFilter`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Search input added successfully');
