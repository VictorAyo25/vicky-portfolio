'use client';

import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Globe, MapPin, Users, TrendingUp } from 'lucide-react';

interface VisitorRecord {
  id: string;
  city: string;
  country: string;
  region: string;
  page: string;
  timestamp: { seconds: number } | null;
}

interface LocationCount {
  name: string;
  count: number;
  percentage: number;
}

export default function AnalyticsPage() {
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVisitors() {
      try {
        const q = query(
          collection(db, 'analytics_visitors'),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        const records: VisitorRecord[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<VisitorRecord, 'id'>),
        }));
        setVisitors(records);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVisitors();
  }, []);

  const totalVisitors = visitors.length;

  const countryStats = useMemo(() => {
    const map = new Map<string, number>();
    visitors.forEach((v) => {
      const key = v.country || 'Unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.map(([name, count]) => ({
      name,
      count,
      percentage: totalVisitors > 0 ? Math.round((count / totalVisitors) * 100) : 0,
    }));
  }, [visitors, totalVisitors]);

  const cityStats = useMemo(() => {
    const map = new Map<string, number>();
    visitors.forEach((v) => {
      const key = v.city && v.city !== 'Unknown' ? `${v.city}, ${v.country || 'Unknown'}` : 'Unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 20).map(([name, count]) => ({
      name,
      count,
      percentage: totalVisitors > 0 ? Math.round((count / totalVisitors) * 100) : 0,
    }));
  }, [visitors, totalVisitors]);

  const uniqueCountries = new Set(visitors.map((v) => v.country).filter(Boolean)).size;
  const uniqueCities = new Set(visitors.map((v) => v.city).filter(Boolean).filter((c) => c !== 'Unknown')).size;

  // Recent visitors (last 24h)
  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return visitors.filter((v) => {
      const ts = v.timestamp?.seconds ? v.timestamp.seconds * 1000 : 0;
      return ts >= cutoff;
    }).length;
  }, [visitors]);

  if (loading) {
    return (
      <div className="p-6 lg:p-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-[#2F2A26] rounded" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-[#191614] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="mb-10 rounded-2xl border border-[#2F2A26] bg-[#171311] px-6 py-6 lg:px-8 lg:py-7">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#C5A059] mb-2">Analytics</p>
          <h1 className="text-3xl lg:text-4xl font-serif text-[#F3F4F6] tracking-tight mb-2">
            Visitor Insights
          </h1>
          <p className="text-gray-400 font-sans">
            See where your audience is viewing from — city and country breakdown.
          </p>
        </header>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={Users} label="Total Visitors" value={totalVisitors} />
          <StatCard icon={Globe} label="Countries" value={uniqueCountries} />
          <StatCard icon={MapPin} label="Cities" value={uniqueCities} />
          <StatCard icon={TrendingUp} label="Last 24 Hours" value={last24h} />
        </div>

        {totalVisitors === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#2F2A26] rounded-2xl">
            <Globe size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-500 font-serif text-xl italic">No visitor data yet.</p>
            <p className="text-gray-600 text-sm mt-2">Data will appear as visitors browse your site.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Countries */}
            <div className="bg-[#191614] border border-[#2F2A26] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                  <Globe size={20} className="text-[#C5A059]" />
                </div>
                <div>
                  <h2 className="text-lg font-serif text-[#F3F4F6]">Visitors by Country</h2>
                  <p className="text-xs text-gray-500">{uniqueCountries} countries reached</p>
                </div>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {countryStats.map((item, i) => (
                  <LocationRow key={item.name} item={item} index={i} />
                ))}
              </div>
            </div>

            {/* Cities */}
            <div className="bg-[#191614] border border-[#2F2A26] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
                  <MapPin size={20} className="text-[#C5A059]" />
                </div>
                <div>
                  <h2 className="text-lg font-serif text-[#F3F4F6]">Visitors by City</h2>
                  <p className="text-xs text-gray-500">Top {Math.min(cityStats.length, 20)} cities</p>
                </div>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {cityStats.map((item, i) => (
                  <LocationRow key={item.name} item={item} index={i} />
                ))}
                {cityStats.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-8">No city data available yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="p-5 bg-[#191614] border border-[#2F2A26] rounded-2xl hover:border-[#C5A059]/50 transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[#C5A059]/10 flex items-center justify-center">
          <Icon size={18} className="text-[#C5A059]" />
        </div>
        <span className="text-xs text-gray-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-3xl font-serif text-[#C5A059]">{value.toLocaleString()}</div>
    </motion.div>
  );
}

const countryToCodeMap: { [key: string]: string } = {
  'Afghanistan': 'AF',
  'Albania': 'AL',
  'Algeria': 'DZ',
  'Andorra': 'AD',
  'Angola': 'AO',
  'Argentina': 'AR',
  'Armenia': 'AM',
  'Australia': 'AU',
  'Austria': 'AT',
  'Azerbaijan': 'AZ',
  'Bahamas': 'BS',
  'Bahrain': 'BH',
  'Bangladesh': 'BD',
  'Barbados': 'BB',
  'Belarus': 'BY',
  'Belgium': 'BE',
  'Belize': 'BZ',
  'Benin': 'BJ',
  'Bhutan': 'BT',
  'Bolivia': 'BO',
  'Bosnia and Herzegovina': 'BA',
  'Botswana': 'BW',
  'Brazil': 'BR',
  'Brunei': 'BN',
  'Bulgaria': 'BG',
  'Burkina Faso': 'BF',
  'Burundi': 'BI',
  'Cambodia': 'KH',
  'Cameroon': 'CM',
  'Canada': 'CA',
  'Cape Verde': 'CV',
  'Central African Republic': 'CF',
  'Chad': 'TD',
  'Chile': 'CL',
  'China': 'CN',
  'Colombia': 'CO',
  'Comoros': 'KM',
  'Congo': 'CG',
  'Costa Rica': 'CR',
  'Croatia': 'HR',
  'Cuba': 'CU',
  'Cyprus': 'CY',
  'Czech Republic': 'CZ',
  'Denmark': 'DK',
  'Djibouti': 'DJ',
  'Dominica': 'DM',
  'Dominican Republic': 'DO',
  'Ecuador': 'EC',
  'Egypt': 'EG',
  'El Salvador': 'SV',
  'Equatorial Guinea': 'GQ',
  'Eritrea': 'ER',
  'Estonia': 'EE',
  'Eswatini': 'SZ',
  'Ethiopia': 'ET',
  'Fiji': 'FJ',
  'Finland': 'FI',
  'France': 'FR',
  'Gabon': 'GA',
  'Gambia': 'GM',
  'Georgia': 'GE',
  'Germany': 'DE',
  'Ghana': 'GH',
  'Greece': 'GR',
  'Grenada': 'GD',
  'Guatemala': 'GT',
  'Guinea': 'GN',
  'Guinea-Bissau': 'GW',
  'Guyana': 'GY',
  'Haiti': 'HT',
  'Honduras': 'HN',
  'Hungary': 'HU',
  'Iceland': 'IS',
  'India': 'IN',
  'Indonesia': 'ID',
  'Iran': 'IR',
  'Iraq': 'IQ',
  'Ireland': 'IE',
  'Israel': 'IL',
  'Italy': 'IT',
  'Jamaica': 'JM',
  'Japan': 'JP',
  'Jordan': 'JO',
  'Kazakhstan': 'KZ',
  'Kenya': 'KE',
  'Kiribati': 'KI',
  'North Korea': 'KP',
  'South Korea': 'KR',
  'Kuwait': 'KW',
  'Kyrgyzstan': 'KG',
  'Laos': 'LA',
  'Latvia': 'LV',
  'Lebanon': 'LB',
  'Lesotho': 'LS',
  'Liberia': 'LR',
  'Libya': 'LY',
  'Liechtenstein': 'LI',
  'Lithuania': 'LT',
  'Luxembourg': 'LU',
  'Madagascar': 'MG',
  'Malawi': 'MW',
  'Malaysia': 'MY',
  'Maldives': 'MV',
  'Mali': 'ML',
  'Malta': 'MT',
  'Marshall Islands': 'MH',
  'Mauritania': 'MR',
  'Mauritius': 'MU',
  'Mexico': 'MX',
  'Micronesia': 'FM',
  'Moldova': 'MD',
  'Monaco': 'MC',
  'Mongolia': 'MN',
  'Montenegro': 'ME',
  'Morocco': 'MA',
  'Mozambique': 'MZ',
  'Myanmar': 'MM',
  'Namibia': 'NA',
  'Nauru': 'NR',
  'Nepal': 'NP',
  'Netherlands': 'NL',
  'New Zealand': 'NZ',
  'Nicaragua': 'NI',
  'Niger': 'NE',
  'Nigeria': 'NG',
  'North Macedonia': 'MK',
  'Norway': 'NO',
  'Oman': 'OM',
  'Pakistan': 'PK',
  'Palau': 'PW',
  'Panama': 'PA',
  'Papua New Guinea': 'PG',
  'Paraguay': 'PY',
  'Peru': 'PE',
  'Philippines': 'PH',
  'Poland': 'PL',
  'Portugal': 'PT',
  'Qatar': 'QA',
  'Romania': 'RO',
  'Russia': 'RU',
  'Rwanda': 'RW',
  'Saint Kitts and Nevis': 'KN',
  'Saint Lucia': 'LC',
  'Saint Vincent and the Grenadines': 'VC',
  'Samoa': 'WS',
  'San Marino': 'SM',
  'Sao Tome and Principe': 'ST',
  'Saudi Arabia': 'SA',
  'Senegal': 'SN',
  'Serbia': 'RS',
  'Seychelles': 'SC',
  'Sierra Leone': 'SL',
  'Singapore': 'SG',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'Solomon Islands': 'SB',
  'Somalia': 'SO',
  'South Africa': 'ZA',
  'Spain': 'ES',
  'Sri Lanka': 'LK',
  'Sudan': 'SD',
  'Suriname': 'SR',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Syria': 'SY',
  'Tajikistan': 'TJ',
  'Tanzania': 'TZ',
  'Thailand': 'TH',
  'Timor-Leste': 'TL',
  'Togo': 'TG',
  'Tonga': 'TO',
  'Trinidad and Tobago': 'TT',
  'Tunisia': 'TN',
  'Turkey': 'TR',
  'Turkmenistan': 'TM',
  'Tuvalu': 'TV',
  'Uganda': 'UG',
  'Ukraine': 'UA',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
  'United States of America': 'US',
  'USA': 'US',
  'UK': 'GB',
  'Great Britain': 'GB',
  'Hong Kong': 'HK',
  'Taiwan': 'TW',
  'Palestine': 'PS',
  'Puerto Rico': 'PR',
  'Uruguay': 'UY',
  'Uzbekistan': 'UZ',
  'Vanuatu': 'VU',
  'Venezuela': 'VE',
  'Vietnam': 'VN',
  'Yemen': 'YE',
  'Zambia': 'ZM',
  'Zimbabwe': 'ZW'
};

function getFlagEmoji(countryName: string): string {
  if (!countryName || countryName === 'Unknown') return '🌐';
  const code = countryToCodeMap[countryName] || countryToCodeMap[countryName.trim()];
  if (!code) return '🌐';

  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getFlagForName(name: string): string {
  if (!name || name === 'Unknown') return '🌐';
  const parts = name.split(', ');
  const countryName = parts.length > 1 ? parts[parts.length - 1] : name;
  return getFlagEmoji(countryName.trim());
}

function LocationRow({ item, index }: { item: LocationCount; index: number }) {
  const flag = getFlagForName(item.name);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-6 text-right shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0 select-none" role="img" aria-label={item.name}>
              {flag}
            </span>
            <span className="text-sm text-gray-300 truncate">{item.name}</span>
          </div>
          <span className="text-xs text-[#C5A059] font-mono ml-2 shrink-0">{item.count}</span>
        </div>
        <div className="h-1.5 bg-[#2F2A26] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${item.percentage}%` }}
            transition={{ duration: 0.6, delay: index * 0.05 }}
            className="h-full bg-[#C5A059] rounded-full"
          />
        </div>
      </div>
      <span className="text-xs text-gray-500 w-10 text-right shrink-0">{item.percentage}%</span>
    </div>
  );
}
