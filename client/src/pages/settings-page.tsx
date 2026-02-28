import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Settings, User, Bell, Shield, Database } from "lucide-react";

export default function SettingsPage() {
    return (
        <DashboardLayout>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
            >
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-display font-bold text-slate-900">Settings</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Settings Navigation */}
                    <div className="space-y-2">
                        {[
                            { label: "Profile", icon: User, active: true },
                            { label: "Notifications", icon: Bell },
                            { label: "Security", icon: Shield },
                            { label: "Storage", icon: Database },
                            { label: "Preferences", icon: Settings },
                        ].map((item) => (
                            <button
                                key={item.label}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${item.active
                                        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    }`}
                            >
                                <item.icon className={`h-4 w-4 ${item.active ? "text-[#c9a84c]" : ""}`} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Settings Content */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-display font-bold text-slate-900">Profile Information</h3>
                                <p className="text-sm text-slate-500">Update your account details and public profile.</p>
                            </div>
                            <div className="p-6 space-y-6 text-center py-20">
                                <div className="h-16 w-16 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-300">
                                    <Settings className="h-8 w-8 text-slate-300" />
                                </div>
                                <h3 className="text-base font-display font-semibold text-slate-900 mb-1">Settings Module under Maintenance</h3>
                                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                    We are currently upgrading the settings module to provide enterprise-grade controls. These features will be available in the next update.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </DashboardLayout>
    );
}
