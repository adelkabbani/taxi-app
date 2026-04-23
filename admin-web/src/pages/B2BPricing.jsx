import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, RefreshCw, CarFront, Zap, Shield, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

const VEHICLE_TYPES = [
    { id: 'sedan', name: 'Standard Sedan', description: 'Regular 4-seater' },
    { id: 'economy_sedan', name: 'Economy Sedan', description: 'Talixo Economy, lower margin' },
    { id: 'business', name: 'Business Class', description: 'Transferz Business, high expectation' },
    { id: 'business_van', name: 'Business Van', description: 'Premium group transport' },
    { id: 'luxury', name: 'Luxury Class', description: 'First class, max 3 pax' },
    { id: 'van', name: 'Standard Van', description: 'Up to 8 pax' },
    { id: 'accessible', name: 'Wheelchair Accessible', description: 'Specialized vehicle' }
];

export default function B2BPricing() {
    const [rules, setRules] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await api.get('/pricing');
            
            const ruleMap = {};
            if (res.data?.data) {
                res.data.data.forEach(item => {
                    ruleMap[item.vehicle_type] = {
                        minPrice: item.min_price,
                        isActive: item.is_active
                    };
                });
            }
            
            setRules(ruleMap);
        } catch (error) {
            console.error('Failed to fetch pricing rules', error);
            toast.error('Failed to load pricing engine rules');
        } finally {
            setLoading(false);
        }
    };

    const handlePriceChange = (vehicleType, value) => {
        setRules(prev => ({
            ...prev,
            [vehicleType]: {
                ...(prev[vehicleType] || { isActive: true }),
                minPrice: value
            }
        }));
    };

    const handleToggleActive = (vehicleType) => {
        setRules(prev => ({
            ...prev,
            [vehicleType]: {
                ...(prev[vehicleType] || { minPrice: 0 }),
                isActive: !(prev[vehicleType]?.isActive ?? true)
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = VEHICLE_TYPES.map(vt => ({
                vehicle_type: vt.id,
                min_price: rules[vt.id]?.minPrice || 0,
                is_active: rules[vt.id]?.isActive ?? true
            }));

            await api.put('/pricing', { rules: payload });
            
            toast.success('B2B Pricing Matrix Updated', {
                duration: 4000,
                icon: '⚡',
                style: {
                    background: '#10b981',
                    color: '#fff',
                    fontWeight: 'bold',
                },
            });
            
            fetchRules();
        } catch (error) {
            console.error('Failed to save rules:', error);
            toast.error('Failed to synchronize pricing matrix');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-ink-black-900 dark:to-ink-black-950 border border-gray-100 dark:border-white/5 shadow-xl dark:shadow-2xl p-8 transition-colors">
                <div className="absolute top-0 right-0 -m-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -m-8 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-ink-black-950 dark:text-white flex items-center gap-3 tracking-tight transition-colors">
                            <Settings className="text-gold-500 dark:text-gold-400 w-8 h-8" />
                            B2B Pricing Matrix
                        </h1>
                        <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-xl text-sm leading-relaxed transition-colors">
                            Configure the <strong>Minimum Acceptable Price</strong> and active state for external aggregator payloads. 
                            The Fast-Lane receiver relies on this in-RAM cache to accept or reject rides within <span className="text-emerald-600 dark:text-emerald-400 font-bold transition-colors">50ms</span>.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                            <Zap className="w-4 h-4 text-emerald-400 fill-emerald-500/50" />
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">RAM Cache Active</span>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-wide text-sm transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30
                                ${saving ? 'bg-gray-100 dark:bg-ink-black-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/5' 
                                : 'bg-emerald-500 hover:bg-emerald-400 text-ink-black-950 hover:-translate-y-0.5'}`}
                        >
                            {saving ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {saving ? 'Syncing...' : 'Deploy Core Update'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Warning Alert */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-amber-500 font-bold text-sm">Critical Sub-System Warning</h3>
                    <p className="text-amber-500/80 text-xs mt-1 leading-relaxed">
                        Setting these thresholds too high will result in the automated webhook immediately returning HTTP 406 Not Acceptable to aggregators. Setting them too low might win unprofitable tours. Changes take effect instantly globally.
                    </p>
                </div>
            </div>

            {/* Pricing Matrix Layout */}
            <div className="bg-white dark:bg-ink-black-900/40 backdrop-blur-md border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-xl dark:shadow-none transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                        [1,2,3,4,5,6].map(i => (
                            <div key={i} className="animate-pulse bg-white/5 h-32 rounded-xl border border-white/5"></div>
                        ))
                    ) : (
                        VEHICLE_TYPES.map((type) => {
                            const rule = rules[type.id] || { minPrice: '', isActive: true };
                            return (
                                <div 
                                    key={type.id} 
                                    className={`group relative bg-gray-50 dark:bg-ink-black-950 border border-gray-100 dark:border-white/5 hover:border-gold-500/30 rounded-xl p-5 transition-all overflow-hidden
                                        ${!rule.isActive ? 'grayscale opacity-40 hover:opacity-50' : 'opacity-100'}`}
                                >
                                    <div className="absolute top-0 right-0 p-3 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                                        <CarFront className="w-16 h-16 text-ink-black-950 dark:text-white" />
                                    </div>
                                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-ink-black-950 dark:text-white font-bold text-lg flex items-center gap-2 transition-colors">
                                                    {type.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-1 transition-colors">{type.description}</p>
                                            </div>
                                            
                                            {/* iOS Style Toggle */}
                                            <button 
                                                onClick={() => handleToggleActive(type.id)}
                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none 
                                                    ${rule.isActive ? 'bg-emerald-500' : 'bg-gray-700'}`}
                                            >
                                                <span 
                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                                        ${rule.isActive ? 'translate-x-5' : 'translate-x-0'}`}
                                                />
                                            </button>
                                        </div>
                                                                                <div className="relative w-full">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                min="0"
                                                step="0.01"
                                                disabled={!rule.isActive}
                                                value={rule.minPrice}
                                                onChange={(e) => handlePriceChange(type.id, e.target.value)}
                                                placeholder="0.00"
                                                className={`w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/10 rounded-lg py-3 pl-8 pr-4 text-ink-black-950 dark:text-white font-mono text-lg focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors shadow-sm dark:shadow-none
                                                    ${!rule.isActive ? 'cursor-not-allowed text-gray-400 dark:text-gray-600' : ''}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            
            {/* Legend / Info */}
            <div className="flex gap-4 items-center text-xs text-gray-500 justify-center">
                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-blue-400" /> Authorized Admin Area</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5 text-gray-400" /> Price represents absolute minimum payout</span>
            </div>
        </div>
    );
}
