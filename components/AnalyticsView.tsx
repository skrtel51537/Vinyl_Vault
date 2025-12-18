import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Disc, TrendingUp, Music, Clock, Activity, Trophy } from 'lucide-react';

const COLORS = ['#78350f', '#854d0e', '#a16207', '#ca8a04', '#d97706', '#ea580c', '#c2410c'];

const AnalyticsView: React.FC = () => {
    const allVinyls = useLiveQuery(() => db.vinyls.toArray());

    const stats = useMemo(() => {
        if (!allVinyls) return null;

        // 1. Decades (The Time Machine)
        const decadeMap = new Map<string, number>();
        allVinyls.forEach(v => {
            if (v.releaseYear) {
                const decade = Math.floor(v.releaseYear / 10) * 10;
                const key = `${decade}s`;
                decadeMap.set(key, (decadeMap.get(key) || 0) + 1);
            }
        });
        const decadesData = Array.from(decadeMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name));

        // 2. Genres (Musical DNA)
        const genreMap = new Map<string, number>();
        allVinyls.forEach(v => {
            v.genre.forEach(g => {
                if (g === 'Rock') return; // Exclude Rock as it is too generic/dominant
                genreMap.set(g, (genreMap.get(g) || 0) + 1);
            });
        });
        const genreData = Array.from(genreMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Top 6

        // 3. Collection Health
        let mintOrNear = 0;
        let goodPlus = 0;
        let totalGraded = 0;

        allVinyls.forEach(v => {
            if (v.conditionMedia) {
                totalGraded++;
                const c = v.conditionMedia.toLowerCase();
                if (c.includes('mint') || c === 'm' || c === 'nm') mintOrNear++;
                else if (c.includes('very good') || c === 'vg+' || c === 'vg') goodPlus++;
            }
        });

        // 4. Top Artists
        const artistMap = new Map<string, number>();
        allVinyls.forEach(v => {
            artistMap.set(v.artist, (artistMap.get(v.artist) || 0) + 1);
        });
        const topArtists = Array.from(artistMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return { decadesData, genreData, health: { mintOrNear, goodPlus, totalGraded }, topArtists };
    }, [allVinyls]);

    if (!stats) return <div className="p-12 text-center">Loading analytics...</div>;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-[#78350f] rounded shadow-xl">
                    <p className="font-bold text-[#78350f]">{label}</p>
                    <p className="text-sm text-stone-600">{payload[0].value} Records</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-amber-100 rounded-full border border-amber-200 flex items-center justify-center text-[#78350f]">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-stone-800 font-serif">Collection Analytics</h1>
                    <p className="text-stone-500">Deep dive into your musical vault</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Time Machine */}
                <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-600" />
                            The Time Machine
                        </h2>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.decadesData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f4' }} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {stats.decadesData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#78350f' : '#92400e'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Musical DNA (Genres) */}
                <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                            <Music className="w-5 h-5 text-amber-600" />
                            Musical DNA
                            <span className="text-xs font-normal text-stone-400 ml-2">(Rock excluded)</span>
                        </h2>
                    </div>
                    <div className="h-64 flex">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.genreData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {stats.genreData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e7e5e4', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#78350f', fontWeight: 600 }} />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#57534e' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Collection Health */}
                <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-amber-600" />
                            Collection Health
                        </h2>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-stone-700">Immaculate (Mint / NM)</span>
                                <span className="font-bold text-[#78350f]">{stats.health.mintOrNear}</span>
                            </div>
                            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${(stats.health.mintOrNear / (stats.health.totalGraded || 1)) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-stone-700">Solid Spinners (VG+ / VG)</span>
                                <span className="font-bold text-[#78350f]">{stats.health.goodPlus}</span>
                            </div>
                            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${(stats.health.goodPlus / (stats.health.totalGraded || 1)) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                        <p className="text-xs text-stone-400 italic text-center mt-4">
                            Based on {stats.health.totalGraded} graded items in your vault.
                        </p>
                    </div>
                </div>

                {/* 4. Top Artists */}
                <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-600" />
                            Hall of Fame
                        </h2>
                    </div>
                    <div className="space-y-4">
                        {stats.topArtists.map((artist, index) => (
                            <div key={artist.name} className="flex items-center gap-4 group">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-stone-100 text-stone-600'
                                    }`}>
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="font-bold text-stone-700 text-sm truncate pr-2">{artist.name}</span>
                                        <span className="text-xs font-semibold text-stone-400 shrink-0">{artist.count} Albums</span>
                                    </div>
                                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#78350f] rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500"
                                            style={{ width: `${(artist.count / stats.topArtists[0].count) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default AnalyticsView;
