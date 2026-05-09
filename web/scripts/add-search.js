const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/admin/ManageContent.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add Search icon import
content = content.replace(
  "import { Loader2, Trash2, Edit, RotateCcw, AlertOctagon, ChevronDown, Filter } from 'lucide-react';",
  "import { Loader2, Trash2, Edit, RotateCcw, AlertOctagon, ChevronDown, Filter, Search, X } from 'lucide-react';"
);

// 2. Add search state after categoryFilter
content = content.replace(
  "const [categoryFilter, setCategoryFilter] = useState<string>('all');",
  "const [categoryFilter, setCategoryFilter] = useState<string>('all');\n  const [searchQuery, setSearchQuery] = useState('');"
);

// 3. Add search filtering in the filteredPosts useMemo, before the image filter
content = content.replace(
  "return [...filteredPosts]\n            .filter((post) => {\n                if (imageFilter === 'has_image') return !!post.coverImage;",
  "return [...filteredPosts]\n            .filter((post) => {\n                if (searchQuery.trim()) {\n                  const q = searchQuery.toLowerCase();\n                  return (\n                    post.title?.toLowerCase().includes(q) ||\n                    post.category?.toLowerCase().includes(q) ||\n                    post.subCategory?.toLowerCase().includes(q)\n                  );\n                }\n                return true;\n            })\n            .filter((post) => {\n                if (imageFilter === 'has_image') return !!post.coverImage;"
);

// 4. Add search input in the header, after the category filter dropdown
content = content.replace(
  `{/* Category Filter */}\n                        {!isTrash && availableCategories.length > 0 && (\n                            <select\n                                value={categoryFilter}\n                                onChange={(e) => setCategoryFilter(e.target.value)}\n                                className=\"bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C5A059]\"\n                                aria-label=\"Filter by category\"\n                            >\n                                <option value=\"all\">All Categories</option>\n                                {availableCategories.map(cat => (\n                                    <option key={cat} value={cat}>{cat}</option>\n                                ))}\n                            </select>\n                        )}`,
  `{/* Category Filter */}\n                        {!isTrash && availableCategories.length > 0 && (\n                            <select\n                                value={categoryFilter}\n                                onChange={(e) => setCategoryFilter(e.target.value)}\n                                className=\"bg-[#0F0E0D] border border-[#2F2A26] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C5A059]\"\n                                aria-label=\"Filter by category\"\n                            >\n                                <option value=\"all\">All Categories</option>\n                                {availableCategories.map(cat => (\n                                    <option key={cat} value={cat}>{cat}</option>\n                                ))}\n                            </select>\n                        )}\n                        {/* Search */}\n                        <div className=\"relative\">\n                            <Search size={14} className=\"absolute left-3 top-1/2 -translate-y-1/2 text-gray-500\" />\n                            <input\n                                type=\"text\"\n                                value={searchQuery}\n                                onChange={(e) => setSearchQuery(e.target.value)}\n                                placeholder=\"Search posts...\"\n                                className=\"bg-[#0F0E0D] border border-[#2F2A26] rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#C5A059] w-48\"\n                            />\n                            {searchQuery && (\n                                <button onClick={() => setSearchQuery('')} className=\"absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white\">\n                                    <X size={14} />\n                                </button>\n                            )}</div>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Search added to ManageContent');
