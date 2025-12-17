'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Trophy,
  Zap,
  Globe,
  Mic,
  Shield,
  TrendingUp,
  Users,
  Coins,
  Activity,
  AlertTriangle,
  Settings,
  Moon,
  Sun,
} from 'lucide-react';

interface DashboardProps {
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
}

export function AdvancedAdminDashboard({ darkMode = false, onToggleDarkMode }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeMetrics, setRealTimeMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Simulated real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      // In production, this would fetch from WebSocket
      updateMetrics();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const updateMetrics = () => {
    // Simulate metric updates
    setRealTimeMetrics([
      {
        metric: 'Active Users',
        value: Math.floor(Math.random() * 500 + 1000),
        change: Math.random() * 10 - 5,
        trend: Math.random() > 0.5 ? 'up' : 'down',
      },
    ]);
  };

  const metrics: MetricCard[] = [
    {
      title: 'AI Predictions',
      value: '156',
      change: 12.5,
      trend: 'up',
      icon: <Brain className="w-6 h-6" />,
      color: 'purple',
    },
    {
      title: 'Gamification Score',
      value: '94.2',
      change: 8.3,
      trend: 'up',
      icon: <Trophy className="w-6 h-6" />,
      color: 'yellow',
    },
    {
      title: 'Crypto Payments',
      value: '$45.2K',
      change: 23.1,
      trend: 'up',
      icon: <Coins className="w-6 h-6" />,
      color: 'green',
    },
    {
      title: 'Infrastructure Health',
      value: '99.9%',
      change: 0.1,
      trend: 'stable',
      icon: <Activity className="w-6 h-6" />,
      color: 'blue',
    },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Zap className="w-4 h-4" /> },
    { id: 'ai-analytics', label: 'AI Analytics', icon: <Brain className="w-4 h-4" /> },
    { id: 'gamification', label: 'Gamification', icon: <Trophy className="w-4 h-4" /> },
    { id: 'blockchain', label: 'Blockchain', icon: <Coins className="w-4 h-4" /> },
    { id: 'realtime', label: 'Real-Time', icon: <Globe className="w-4 h-4" /> },
    { id: 'accessibility', label: 'Accessibility', icon: <Mic className="w-4 h-4" /> },
    { id: 'infrastructure', label: 'Infrastructure', icon: <Shield className="w-4 h-4" /> },
  ];

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-900';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${cardBg} border-b ${borderColor} sticky top-0 z-50 backdrop-blur-lg bg-opacity-80`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Zap className="w-8 h-8 text-blue-500" />
              <h1 className="text-2xl font-bold">Advanced Admin Control</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={onToggleDarkMode}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} hover:scale-110 transition-transform`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white hover:scale-105 transition-transform`}>
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={`${cardBg} border-b ${borderColor}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? darkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : darkMode
                    ? 'hover:bg-gray-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${cardBg} rounded-xl p-6 border ${borderColor} shadow-lg hover:shadow-xl transition-shadow`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${metric.color}-100 dark:bg-${metric.color}-900`}>
                  {metric.icon}
                </div>
                <div className={`flex items-center space-x-1 text-sm ${metric.trend === 'up' ? 'text-green-500' : metric.trend === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
                  <TrendingUp className="w-4 h-4" />
                  <span>{metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%</span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{metric.title}</h3>
              <p className="text-3xl font-bold mt-2">{metric.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className={`${cardBg} rounded-xl p-6 border ${borderColor}`}>
                <h2 className="text-xl font-bold mb-4">System Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Recent AI Predictions</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center space-x-2">
                        <Brain className="w-4 h-4 text-purple-500" />
                        <span className="text-sm">12 churn predictions identified</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm">8 upsell opportunities detected</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm">2 fraud alerts triggered</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Gamification Highlights</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">45 achievements unlocked today</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Leaderboard: 234 active participants</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-purple-500" />
                        <span className="text-sm">3 new milestones reached</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className={`${cardBg} rounded-xl p-6 border ${borderColor}`}>
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors">
                    <Brain className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                    <span className="text-sm font-medium">Run AI Analysis</span>
                  </button>
                  <button className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors">
                    <Coins className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <span className="text-sm font-medium">View Crypto Payments</span>
                  </button>
                  <button className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors">
                    <Globe className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <span className="text-sm font-medium">Activity Map</span>
                  </button>
                  <button className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors">
                    <Shield className="w-6 h-6 mx-auto mb-2 text-red-500" />
                    <span className="text-sm font-medium">Infrastructure Health</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ai-analytics' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`${cardBg} rounded-xl p-6 border ${borderColor}`}
            >
              <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <Brain className="w-6 h-6 text-purple-500" />
                <span>AI-Powered Analytics</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Leverage machine learning for predictive analytics, churn prevention, and fraud detection.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold mb-2">Churn Prediction</h3>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">87%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy rate</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold mb-2">Upsell Success</h3>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">34%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Conversion rate</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <h3 className="font-semibold mb-2">Fraud Detection</h3>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">99.2%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Detection rate</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'gamification' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`${cardBg} rounded-xl p-6 border ${borderColor}`}
            >
              <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <span>Gamification & Leaderboards</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Track affiliate performance, achievements, and milestone rewards.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800">
                  <h3 className="font-semibold mb-2">Top Affiliates This Month</h3>
                  <div className="space-y-2">
                    {[1, 2, 3].map((rank) => (
                      <div key={rank} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : 'bg-orange-600'} text-white font-bold`}>
                            {rank}
                          </div>
                          <span className="font-medium">Affiliate {rank}</span>
                        </div>
                        <span className="font-bold">{1000 - rank * 100} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'blockchain' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`${cardBg} rounded-xl p-6 border ${borderColor}`}
            >
              <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <Coins className="w-6 h-6 text-green-500" />
                <span>Blockchain & Web3 Integration</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Cryptocurrency payments, NFT rewards, and immutable audit logs.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold mb-2">Crypto Payments</h3>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">$45.2K</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This month (BTC, ETH, USDT, USDC)</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold mb-2">NFTs Minted</h3>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">156</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Achievement rewards</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdvancedAdminDashboard;
