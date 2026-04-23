import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, RefreshCw, CheckCircle, Clock, XCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

const STATUS_STYLES = {
    pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20' },
    issued:  { label: 'Issued',  color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' },
    paid:    { label: 'Paid',    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
    not_required: { label: 'N/A', color: 'bg-gray-100 dark:bg-slate-500/10 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-500/20' },
};

function StatusBadge({ status }) {
    const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
    return <span className={`px-2 py-1 rounded-md text-xs font-bold ${s.color}`}>{s.label}</span>;
}

export default function Invoices() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchInvoices = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: pagination.limit });
            if (statusFilter) params.set('status', statusFilter);
            const res = await api.get(`/invoices?${params}`);
            setInvoices(res.data.data);
            setPagination(p => ({ ...p, ...res.data.pagination, page }));
        } catch (err) {
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, pagination.limit]);

    useEffect(() => { fetchInvoices(1); }, [statusFilter]);

    const markPaid = async (id) => {
        try {
            await api.patch(`/invoices/${id}/status`, { status: 'paid' });
            toast.success('Invoice marked as paid');
            fetchInvoices(pagination.page);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update invoice');
        }
    };

    const deleteInvoice = async (id) => {
        if (!confirm('Delete this invoice?')) return;
        try {
            await api.delete(`/invoices/${id}`);
            toast.success('Invoice deleted');
            fetchInvoices(pagination.page);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete invoice');
        }
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    const filtered = search
        ? invoices.filter(inv =>
            inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
            inv.passenger_name?.toLowerCase().includes(search.toLowerCase()) ||
            inv.partner_name?.toLowerCase().includes(search.toLowerCase())
          )
        : invoices;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-ink-black-950 dark:text-white transition-colors">Invoices</h1>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 transition-colors">{pagination.total} total invoices</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fetchInvoices(pagination.page)}
                        className="p-2 text-gray-400 dark:text-slate-400 hover:text-ink-black-950 dark:hover:text-white transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-ink-black-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-gold-500/20"
                    >
                        <Plus size={16} /> New Invoice
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by number, passenger, partner..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-ink-black-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-gold-500/50 transition-colors shadow-sm dark:shadow-none"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-500/50 transition-colors shadow-sm dark:shadow-none"
                >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="issued">Issued</option>
                    <option value="paid">Paid</option>
                </select>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Pending', value: invoices.filter(i => i.status === 'pending').length, icon: Clock, color: 'text-yellow-600 dark:text-yellow-400' },
                    { label: 'Issued', value: invoices.filter(i => i.status === 'issued').length, icon: FileText, color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white dark:bg-ink-black-900 border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex items-center gap-3 shadow-sm dark:shadow-none transition-colors">
                        <Icon size={20} className={color} />
                        <div>
                            <p className="text-xl font-bold text-ink-black-950 dark:text-white transition-colors">{value}</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 transition-colors">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-ink-black-900 border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-xl dark:shadow-none transition-colors">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw size={24} className="animate-spin text-gold-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500 transition-colors">
                        <FileText size={40} className="mb-3 opacity-30" />
                        <p className="text-sm font-medium">No invoices found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-slate-400 text-xs uppercase tracking-wider transition-colors">
                                    <th className="text-left p-4">Invoice #</th>
                                    <th className="text-left p-4">Booking</th>
                                    <th className="text-left p-4">Partner</th>
                                    <th className="text-left p-4">Date</th>
                                    <th className="text-right p-4">Amount</th>
                                    <th className="text-center p-4">Status</th>
                                    <th className="text-center p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {filtered.map(inv => (
                                    <tr
                                        key={inv.id}
                                        className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors"
                                    >
                                        <td className="p-4 font-mono text-xs text-gold-600 dark:text-gold-400">{inv.invoice_number}</td>
                                        <td className="p-4">
                                            <p className="text-ink-black-900 dark:text-white font-medium truncate max-w-40 transition-colors">{inv.pickup_address || '—'}</p>
                                            <p className="text-gray-400 dark:text-slate-500 text-xs truncate max-w-40 transition-colors">{inv.dropoff_address}</p>
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-slate-300 transition-colors">{inv.partner_name || '—'}</td>
                                        <td className="p-4 text-gray-400 dark:text-slate-400 text-xs whitespace-nowrap transition-colors">
                                            {new Date(inv.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right font-bold text-ink-black-900 dark:text-white transition-colors">
                                            € {parseFloat(inv.total_amount).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <StatusBadge status={inv.status} />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {inv.status !== 'paid' && (
                                                    <button
                                                        onClick={() => markPaid(inv.id)}
                                                        title="Mark as paid"
                                                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                                    >
                                                        <CheckCircle size={14} />
                                                    </button>
                                                )}
                                                {inv.status !== 'paid' && (
                                                    <button
                                                        onClick={() => deleteInvoice(inv.id)}
                                                        title="Delete invoice"
                                                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-400 dark:text-slate-400 transition-colors">
                    <span>Page {pagination.page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={pagination.page <= 1}
                            onClick={() => fetchInvoices(pagination.page - 1)}
                            className="p-2 rounded-lg bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 disabled:opacity-30 hover:border-gray-300 dark:hover:border-white/20 transition-all shadow-sm dark:shadow-none"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            disabled={pagination.page >= totalPages}
                            onClick={() => fetchInvoices(pagination.page + 1)}
                            className="p-2 rounded-lg bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 disabled:opacity-30 hover:border-gray-300 dark:hover:border-white/20 transition-all shadow-sm dark:shadow-none"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Create Invoice Modal */}
            {showCreateModal && (
                <CreateInvoiceModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { setShowCreateModal(false); fetchInvoices(1); }}
                />
            )}
        </div>
    );
}

function CreateInvoiceModal({ onClose, onCreated }) {
    const [form, setForm] = useState({
        booking_id: '',
        fare_final: '',
        waiting_fee: '0',
        no_show_fee: '0',
        commission: '0',
        payment_method: 'invoice',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/invoices', {
                ...form,
                booking_id: parseInt(form.booking_id),
                fare_final: parseFloat(form.fare_final),
                waiting_fee: parseFloat(form.waiting_fee),
                no_show_fee: parseFloat(form.no_show_fee),
                commission: parseFloat(form.commission),
            });
            toast.success('Invoice created');
            onCreated();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create invoice');
        } finally {
            setSaving(false);
        }
    };

    const total = (parseFloat(form.fare_final) || 0) +
                  (parseFloat(form.waiting_fee) || 0) +
                  (parseFloat(form.no_show_fee) || 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-ink-black-950 border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl transition-colors"
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5 transition-colors">
                    <h2 className="text-lg font-bold text-ink-black-950 dark:text-white transition-colors">New Invoice</h2>
                    <button onClick={onClose} className="text-gray-400 dark:text-slate-400 hover:text-ink-black-950 dark:hover:text-white transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 dark:text-slate-400 mb-1 font-semibold uppercase tracking-wider transition-colors">Booking ID</label>
                        <input
                            type="number"
                            required
                            value={form.booking_id}
                            onChange={e => setForm(f => ({ ...f, booking_id: e.target.value }))}
                            placeholder="e.g. 42"
                            className="w-full bg-gray-50 dark:bg-ink-black-900 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-ink-black-900 dark:text-white focus:outline-none focus:border-gold-500/50 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { key: 'fare_final', label: 'Fare (€)', required: true },
                            { key: 'waiting_fee', label: 'Waiting Fee (€)' },
                            { key: 'no_show_fee', label: 'No-show Fee (€)' },
                            { key: 'commission', label: 'Commission (€)' },
                        ].map(({ key, label, required }) => (
                             <div key={key}>
                                <label className="block text-xs text-gray-400 dark:text-slate-400 mb-1 font-semibold uppercase tracking-wider transition-colors">{label}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required={required}
                                    value={form[key]}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                    className="w-full bg-gray-50 dark:bg-ink-black-900 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-ink-black-900 dark:text-white focus:outline-none focus:border-gold-500/50 transition-colors"
                                />
                            </div>
                        ))}
                    </div>

                     <div>
                        <label className="block text-xs text-gray-400 dark:text-slate-400 mb-1 font-semibold uppercase tracking-wider transition-colors">Payment Method</label>
                        <select
                            value={form.payment_method}
                            onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                            className="w-full bg-gray-50 dark:bg-ink-black-900 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-ink-black-900 dark:text-white focus:outline-none focus:border-gold-500/50 transition-colors"
                        >
                            <option value="invoice">Invoice</option>
                            <option value="cash">Cash</option>
                            <option value="card_in_car">Card in Car</option>
                            <option value="partner_paid">Partner Paid</option>
                        </select>
                    </div>

                     <div className="bg-gray-50 dark:bg-ink-black-900 rounded-xl p-3 flex justify-between items-center border border-gray-100 dark:border-white/5 transition-colors">
                        <span className="text-gray-400 dark:text-slate-400 text-sm">Total</span>
                        <span className="text-ink-black-950 dark:text-white font-bold text-lg transition-colors">€ {total.toFixed(2)}</span>
                    </div>

                     <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-400 dark:text-slate-400 hover:text-ink-black-950 dark:hover:text-white text-sm font-semibold transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-ink-black-950 font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-gold-500/20">
                            {saving ? 'Creating...' : 'Create Invoice'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
