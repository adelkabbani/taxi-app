import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Lock, Mail, Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', data);

            const { token, user } = response.data.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            setIsSuccess(true);
            toast.success(`Welcome back, ${user.firstName}!`);
            
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#e8eef8] dark:bg-ink-black-950 p-4 relative overflow-hidden transition-colors duration-1000">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gold-500/10 dark:bg-gold-500/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-gold-600/5 dark:bg-gold-600/5 rounded-full blur-[140px] animate-pulse delay-700" />
            </div>

            <div className="max-w-md w-full relative z-10">
                <div className="bg-white/90 dark:bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-regal-navy/12 dark:border-white/10 shadow-[0_24px_60px_rgba(0,29,61,0.15)] dark:shadow-2xl relative overflow-visible">
                    <div className="p-10">
                        <div className="text-center mb-10 relative">
                            <div className="mb-10 flex justify-center">
                                <motion.img
                                    initial="initial"
                                    animate={isSuccess ? "success" : "animate"}
                                    variants={{
                                        initial: { scale: 0.5, opacity: 0, y: 20 },
                                        animate: { 
                                            scale: [1, 1.02, 1],
                                            opacity: 1,
                                            y: 0,
                                            filter: ['drop-shadow(0 0 10px rgba(255,214,10,0.2))', 'drop-shadow(0 0 30px rgba(255,214,10,0.4))', 'drop-shadow(0 0 10px rgba(255,214,10,0.2))']
                                        },
                                        success: {
                                            scale: [1, 1.2, 80],
                                            opacity: [1, 1, 0],
                                            rotate: [0, -5, 0],
                                            transition: { 
                                                duration: 2.2, 
                                                times: [0, 0.2, 1],
                                                ease: [0.22, 1, 0.36, 1] 
                                            }
                                        }
                                    }}
                                    transition={{ 
                                        scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                                        filter: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                                        initial: { type: "spring", stiffness: 100 }
                                    }}
                                    src="/logo.png"
                                    alt="DriveZFlight"
                                    className="h-28 w-auto relative z-[100] transition-all"
                                />
                            </div>

                            <motion.div
                                animate={isSuccess ? { opacity: 0, y: -20, filter: 'blur(10px)' } : { opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h1 className="text-[11px] font-black text-gold-600 dark:text-gold-500 uppercase tracking-[0.5em] mb-3 leading-none drop-shadow-[0_0_10px_rgba(255,214,10,0.3)] transition-colors">
                                    Fleet Command
                                </h1>
                                <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-60 transition-colors">
                                    Secured Orbital Link
                                </p>
                            </motion.div>
                        </div>

                        <motion.form 
                            onSubmit={handleSubmit(onSubmit)} 
                            className="space-y-6"
                            animate={isSuccess ? { opacity: 0, scale: 0.9, filter: 'blur(20px)' } : { opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors">Access Identity</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-gold-500 transition-colors" />
                                    <input
                                        {...register('email', { required: 'Identity required' })}
                                        type="text"
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-regal-navy/12 dark:border-white/10 bg-regal-navy/5 dark:bg-white/5 font-black text-[10px] uppercase tracking-widest text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-500/50 focus:ring-4 focus:ring-gold-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-700"
                                        placeholder="ADMIN-OPS"
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-tighter ml-1">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors">Vector Protocol</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-gold-500 transition-colors" />
                                    <input
                                        {...register('password', { required: 'Protocol required' })}
                                        type="password"
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-regal-navy/12 dark:border-white/10 bg-regal-navy/5 dark:bg-white/5 font-black text-[10px] uppercase tracking-widest text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-500/50 focus:ring-4 focus:ring-gold-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-700"
                                        placeholder="••••••••"
                                    />
                                </div>
                                {errors.password && (
                                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-tighter ml-1">{errors.password.message}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || isSuccess}
                                className="w-full bg-gold-500 hover:bg-gold-400 text-ink-black-950 font-black text-[10px] uppercase tracking-[0.3em] py-5 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gold-500/20 active:scale-95"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : isSuccess ? (
                                    'Uplink Established'
                                ) : (
                                    'Initialize Command'
                                )}
                            </button>
                        </motion.form>
                    </div>

                    <motion.div 
                        className="p-8 bg-regal-navy/4 dark:bg-white/5 border-t border-regal-navy/8 dark:border-white/10 text-center rounded-b-[2.5rem] transition-colors"
                        animate={isSuccess ? { opacity: 0, height: 0, padding: 0 } : { opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.4 }}
                    >
                        <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] opacity-50 transition-colors">
                            Corporate Encryption Active • DriveZFlight Systems
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
