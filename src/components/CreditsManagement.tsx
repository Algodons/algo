import React, { useState, useEffect } from 'react';
import './CreditsManagement.css';

interface CreditBalance {
  userId: number;
  balance: number;
  currency: string;
  autoReloadEnabled: boolean;
  autoReloadThreshold?: number;
  autoReloadAmount?: number;
}

interface CreditTransaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

const CreditsManagement: React.FC = () => {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [autoReload, setAutoReload] = useState({
    enabled: false,
    threshold: '',
    amount: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreditsData();
  }, []);

  const fetchCreditsData = async () => {
    try {
      // Fetch balance
      const balanceResponse = await fetch('/api/credits/balance');
      const balanceData = await balanceResponse.json();
      setBalance(balanceData.balance);

      // Set auto-reload state
      if (balanceData.balance) {
        setAutoReload({
          enabled: balanceData.balance.autoReloadEnabled,
          threshold: balanceData.balance.autoReloadThreshold?.toString() || '',
          amount: balanceData.balance.autoReloadAmount?.toString() || '',
        });
      }

      // Fetch transactions
      const transactionsResponse = await fetch('/api/credits/history?limit=20');
      const transactionsData = await transactionsResponse.json();
      setTransactions(transactionsData.transactions);
    } catch (error) {
      console.error('Error fetching credits data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseCredits = async () => {
    const amount = parseFloat(purchaseAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        throw new Error('Failed to purchase credits');
      }

      alert('Credits purchased successfully!');
      setPurchaseAmount('');
      fetchCreditsData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleConfigureAutoReload = async () => {
    const threshold = parseFloat(autoReload.threshold);
    const amount = parseFloat(autoReload.amount);

    if (autoReload.enabled && (!threshold || !amount || threshold <= 0 || amount <= 0)) {
      alert('Please enter valid threshold and amount values');
      return;
    }

    try {
      const response = await fetch('/api/credits/auto-reload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: autoReload.enabled,
          threshold: autoReload.enabled ? threshold : undefined,
          amount: autoReload.enabled ? amount : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to configure auto-reload');
      }

      alert('Auto-reload settings updated!');
      fetchCreditsData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: balance?.currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    const icons: Record<string, string> = {
      purchase: '💳',
      usage: '⚡',
      refund: '↩️',
      bonus: '🎁',
      adjustment: '⚙️',
      auto_reload: '🔄',
    };
    return icons[type] || '📝';
  };

  const getTransactionColor = (type: string) => {
    if (['purchase', 'refund', 'bonus', 'auto_reload'].includes(type)) {
      return '#48bb78';
    }
    return '#fc8181';
  };

  if (loading) {
    return <div className="credits-loading">Loading credits information...</div>;
  }

  return (
    <div className="credits-management">
      <div className="credits-header">
        <h1>Credits Management</h1>
        <p>Purchase and manage your prepaid credits</p>
      </div>

      {/* Current Balance */}
      <div className="credits-section balance-section">
        <div className="balance-card">
          <div className="balance-icon">💰</div>
          <div className="balance-info">
            <h2>Current Balance</h2>
            <p className="balance-amount">{formatCurrency(balance?.balance || 0)}</p>
          </div>
        </div>
      </div>

      {/* Purchase Credits */}
      <div className="credits-section purchase-section">
        <h2>Purchase Credits</h2>
        <div className="purchase-form">
          <div className="quick-amounts">
            <button onClick={() => setPurchaseAmount('10')}>$10</button>
            <button onClick={() => setPurchaseAmount('25')}>$25</button>
            <button onClick={() => setPurchaseAmount('50')}>$50</button>
            <button onClick={() => setPurchaseAmount('100')}>$100</button>
          </div>
          <div className="custom-amount">
            <input
              type="number"
              placeholder="Enter custom amount"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              min="1"
              step="0.01"
            />
            <button
              className="btn-purchase"
              onClick={handlePurchaseCredits}
              disabled={!purchaseAmount || parseFloat(purchaseAmount) <= 0}
            >
              Purchase Credits
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Reload Configuration */}
      <div className="credits-section auto-reload-section">
        <h2>Auto-Reload Settings</h2>
        <div className="auto-reload-form">
          <div className="toggle-container">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={autoReload.enabled}
                onChange={(e) =>
                  setAutoReload({ ...autoReload, enabled: e.target.checked })
                }
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              {autoReload.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {autoReload.enabled && (
            <div className="auto-reload-settings">
              <div className="form-group">
                <label>Reload when balance falls below</label>
                <input
                  type="number"
                  placeholder="Threshold amount"
                  value={autoReload.threshold}
                  onChange={(e) =>
                    setAutoReload({ ...autoReload, threshold: e.target.value })
                  }
                  min="1"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Reload amount</label>
                <input
                  type="number"
                  placeholder="Amount to add"
                  value={autoReload.amount}
                  onChange={(e) =>
                    setAutoReload({ ...autoReload, amount: e.target.value })
                  }
                  min="1"
                  step="0.01"
                />
              </div>
              <button className="btn-save" onClick={handleConfigureAutoReload}>
                Save Settings
              </button>
            </div>
          )}

          {!autoReload.enabled && (
            <p className="auto-reload-description">
              Enable auto-reload to automatically purchase credits when your balance
              falls below a specified threshold.
            </p>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="credits-section transactions-section">
        <h2>Transaction History</h2>
        <div className="transactions-list">
          {transactions.length === 0 ? (
            <p className="no-transactions">No transactions yet</p>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-icon">
                  {getTransactionIcon(transaction.type)}
                </div>
                <div className="transaction-details">
                  <h3>{transaction.type.replace(/_/g, ' ').toUpperCase()}</h3>
                  <p className="transaction-description">
                    {transaction.description}
                  </p>
                  <p className="transaction-date">{formatDate(transaction.createdAt)}</p>
                </div>
                <div className="transaction-amount">
                  <span
                    className="amount"
                    style={{ color: getTransactionColor(transaction.type) }}
                  >
                    {transaction.amount >= 0 ? '+' : ''}
                    {formatCurrency(transaction.amount)}
                  </span>
                  <span className="balance-after">
                    Balance: {formatCurrency(transaction.balanceAfter)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditsManagement;
