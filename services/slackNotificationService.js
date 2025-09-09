const axios = require('axios');
const moment = require('moment');

class SlackNotificationService {
  constructor(webhookUrl) {
    // If webhook URL provided, validate and store it
    if (webhookUrl) {
      if (!webhookUrl.startsWith('https://hooks.slack.com/services/')) {
        throw new Error('Invalid webhook URL format. Must start with https://hooks.slack.com/services/');
      }
      this.webhookUrl = webhookUrl;
    } else {
      // No webhook URL provided - will be required when methods are called
      this.webhookUrl = null;
    }
  }

  /**
   * Get webhook URL - either from instance or environment
   * @param {string} customWebhookUrl - Optional custom webhook URL
   * @returns {string} - Webhook URL
   */
  getWebhookUrl(customWebhookUrl) {
    if (customWebhookUrl) {
      if (!customWebhookUrl.startsWith('https://hooks.slack.com/services/')) {
        throw new Error('Invalid webhook URL format. Must start with https://hooks.slack.com/services/');
      }
      return customWebhookUrl;
    }
    
    if (this.webhookUrl) {
      return this.webhookUrl;
    }
    
    const envWebhook = process.env.SLACK_WEBHOOK_URL;
    if (envWebhook) {
      return envWebhook;
    }
    
    throw new Error('Webhook URL is required. Please provide a webhook URL parameter or set SLACK_WEBHOOK_URL environment variable.');
  }


  /**
   * Create a new instance with a specific webhook URL
   * @param {string} webhookUrl - The webhook URL to use
   * @returns {SlackNotificationService} - New instance with the specified webhook
   */
  static withWebhook(webhookUrl) {
    return new SlackNotificationService(webhookUrl);
  }

  /**
   * Send a simple text message to Slack
   * @param {string} message - The message to send
   * @param {string} channel - Optional channel override
   * @returns {Promise<boolean>} - Success status
   */
  async sendMessage(message, channel = null, webhookUrl = null) {
    try {
      const payload = {
        text: message,
        ...(channel && { channel })
      };

      const finalWebhookUrl = this.getWebhookUrl(webhookUrl);

      const response = await axios.post(finalWebhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        return true;
      } else {
        console.error('Failed to send Slack notification:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error sending Slack notification:', error.message);
      return false;
    }
  }

  /**
   * Send a rich message with attachments to Slack
   * @param {string} text - Main message text
   * @param {Array} attachments - Array of attachment objects
   * @param {string} channel - Optional channel override
   * @returns {Promise<boolean>} - Success status
   */
  async sendRichMessage(text, attachments = [], channel = null, webhookUrl = null) {
    try {
      const payload = {
        text,
        attachments,
        ...(channel && { channel })
      };

      const finalWebhookUrl = this.getWebhookUrl(webhookUrl);

      const response = await axios.post(finalWebhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        return true;
      } else {
        console.error('Failed to send Slack rich notification:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error sending Slack rich notification:', error.message);
      return false;
    }
  }

  /**
   * Send a trade notification with formatted data
   * @param {Object} tradeData - Trade information
   * @param {string} webhookUrl - Optional webhook URL override
   * @returns {Promise<boolean>} - Success status
   */
  async sendTradeNotification(tradeData, webhookUrl = null) {
    const { symbol, action, quantity, price, pnl, strategy } = tradeData;
    
    const color = pnl >= 0 ? 'good' : 'danger';
    const emoji = pnl >= 0 ? '📈' : '📉';
    
    const attachment = {
      color,
      title: `${emoji} Trade ${action}`,
      fields: [
        {
          title: 'Symbol',
          value: symbol,
          short: true
        },
        {
          title: 'Action',
          value: action,
          short: true
        },
        {
          title: 'Quantity',
          value: quantity.toString(),
          short: true
        },
        {
          title: 'Price',
          value: `₹${price}`,
          short: true
        },
        {
          title: 'P&L',
          value: `₹${pnl}`,
          short: true
        },
        {
          title: 'Strategy',
          value: strategy || 'N/A',
          short: true
        }
      ],
      footer: 'Trading Journal',
      ts: Math.floor(Date.now() / 1000)
    };

    return await this.sendRichMessage(`Trade ${action} executed`, [attachment], null, webhookUrl);
  }

  /**
   * Send an order notification
   * @param {Object} orderData - Order information
   * @param {string} webhookUrl - Optional webhook URL override
   * @returns {Promise<boolean>} - Success status
   */
  async sendOrderNotification(orderData, webhookUrl = null) {
    const { symbol, action, quantity, price, status, orderType } = orderData;
    
    const color = status === 'COMPLETE' ? 'good' : 
                  status === 'REJECTED' ? 'danger' : 'warning';
    
    const attachment = {
      color,
      title: `📋 Order ${status}`,
      fields: [
        {
          title: 'Symbol',
          value: symbol,
          short: true
        },
        {
          title: 'Action',
          value: action,
          short: true
        },
        {
          title: 'Quantity',
          value: quantity.toString(),
          short: true
        },
        {
          title: 'Price',
          value: `₹${price}`,
          short: true
        },
        {
          title: 'Type',
          value: orderType,
          short: true
        },
        {
          title: 'Status',
          value: status,
          short: true
        }
      ],
      footer: 'Trading Journal',
      ts: Math.floor(Date.now() / 1000)
    };

    return await this.sendRichMessage(`Order ${status.toLowerCase()}`, [attachment], null, webhookUrl);
  }

  /**
   * Send a strategy performance notification
   * @param {Object} strategyData - Strategy performance data
   * @param {string} webhookUrl - Optional webhook URL override
   * @returns {Promise<boolean>} - Success status
   */
  async sendStrategyPerformanceNotification(strategyData, webhookUrl = null) {
    const { strategyName, totalPnl, winRate, totalTrades, period } = strategyData;
    
    const color = totalPnl >= 0 ? 'good' : 'danger';
    const emoji = totalPnl >= 0 ? '🎯' : '⚠️';
    
    const attachment = {
      color,
      title: `${emoji} Strategy Performance Update`,
      fields: [
        {
          title: 'Strategy',
          value: strategyName,
          short: true
        },
        {
          title: 'Period',
          value: period,
          short: true
        },
        {
          title: 'Total P&L',
          value: `₹${totalPnl}`,
          short: true
        },
        {
          title: 'Win Rate',
          value: `${winRate}%`,
          short: true
        },
        {
          title: 'Total Trades',
          value: totalTrades.toString(),
          short: true
        }
      ],
      footer: 'Trading Journal',
      ts: Math.floor(Date.now() / 1000)
    };

    return await this.sendRichMessage(`Strategy Performance Update: ${strategyName}`, [attachment], null, webhookUrl);
  }

  /**
   * Send an error notification
   * @param {string} errorMessage - Error message
   * @param {string} context - Context where error occurred
   * @param {string} webhookUrl - Optional webhook URL override
   * @returns {Promise<boolean>} - Success status
   */
  async sendErrorNotification(errorMessage, context = 'System', webhookUrl = null) {
    const attachment = {
      color: 'danger',
      title: '🚨 Error Alert',
      fields: [
        {
          title: 'Context',
          value: context,
          short: true
        },
        {
          title: 'Error',
          value: errorMessage,
          short: false
        }
      ],
      footer: 'Trading Journal',
      ts: Math.floor(Date.now() / 1000)
    };

    return await this.sendRichMessage(`Error in ${context}`, [attachment], null, webhookUrl);
  }

  /**
   * Send a daily summary notification
   * @param {Object} summaryData - Daily summary data
   * @param {string} webhookUrl - Optional webhook URL override
   * @returns {Promise<boolean>} - Success status
   */
  async sendDailySummary(summaryData, webhookUrl = null) {
    const { 
      date, 
      summary, 
      openTrades, 
      todayOrders, 
      topStrategies, 
      monthlyPerformance 
    } = summaryData;
    
    const color = summary.monthlyPnL >= 0 ? 'good' : 'danger';
    const emoji = summary.monthlyPnL >= 0 ? '📊' : '📉';
    
    // Main summary attachment
    const mainAttachment = {
      color,
      title: `${emoji} Daily Trading Summary - ${date}`,
      fields: [
        {
          title: '📈 Monthly Performance',
          value: `Month: ${monthlyPerformance.monthName} ${monthlyPerformance.year}\nExpected: ₹${monthlyPerformance.expectedReturn}\nActual: ₹${monthlyPerformance.actualReturn}\nVariance: ₹${monthlyPerformance.variance}\nBalance: ₹${monthlyPerformance.accountBalance}`,
          short: true
        },
        {
          title: '📋 Today\'s Activity',
          value: `Orders Created: ${summary.totalTodayOrders}\nOpen Trades: ${summary.totalOpenTrades}\nActive Strategies: ${summary.totalOpenStrategies}`,
          short: true
        }
      ],
      footer: 'Trading Journal',
      ts: Math.floor(Date.now() / 1000)
    };

    const attachments = [mainAttachment];

    // Add open trades section if any
    if (openTrades && openTrades.length > 0) {
      const tradesText = openTrades.map(trade => 
        `• ${trade.asset} (${trade.type}) - Qty: ${trade.quantity} @ ₹${trade.price}`
      ).join('\n');
      
      attachments.push({
        color: '#36a64f',
        title: '🔓 Open Trades',
        text: tradesText,
        footer: 'Trading Journal'
      });
    }

    // Add today's orders section if any
    if (todayOrders && todayOrders.length > 0) {
      const ordersText = todayOrders.map(order => 
        `• ${order.ordertype} ${order.asset} (${order.type}) - Qty: ${order.quantity} @ ₹${order.price}`
      ).join('\n');
      
      attachments.push({
        color: '#ff9500',
        title: '📝 Today\'s Orders',
        text: ordersText,
        footer: 'Trading Journal'
      });
    }

    // Add top strategies section if any
    if (topStrategies && topStrategies.length > 0) {
      const strategiesText = topStrategies.map(strategy => 
        `• ${strategy.name}: ₹${strategy.latestPnL} (${strategy.latestDate ? moment(strategy.latestDate).format('MMM DD') : 'No data'})`
      ).join('\n');
      
      attachments.push({
        color: '#9c27b0',
        title: '🏆 Top Strategies (Latest P&L)',
        text: strategiesText,
        footer: 'Trading Journal'
      });
    }

    return await this.sendRichMessage(`📊 Daily Summary for ${date}`, attachments, null, webhookUrl);
  }
}

module.exports = new SlackNotificationService();
