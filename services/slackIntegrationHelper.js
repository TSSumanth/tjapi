const SlackNotificationServiceInstance = require('./slackNotificationService');
const dailySummaryService = require('./dailySummaryService');

class SlackIntegrationHelper {
  constructor() {
    // No configuration needed - consumer must provide webhook URLs
  }


  /**
   * Send notification with webhook URL (non-blocking)
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {string} webhookUrl - Required webhook URL
   */
  async sendNotification(type, data, webhookUrl) {
    if (!webhookUrl) {
      throw new Error('Webhook URL is required for sending notifications');
    }

    try {
      const service = SlackNotificationServiceInstance;
      
      switch (type) {
        case 'TRADES':
          await service.sendTradeNotification(data, webhookUrl);
          break;
        case 'ORDERS':
          await service.sendOrderNotification(data, webhookUrl);
          break;
        case 'STRATEGIES':
          await service.sendMessage(
            `🎯 New Strategy Created: ${data.name}\n` +
            `Symbol: ${data.symbol}\n` +
            `Status: ${data.status}\n` +
            `Description: ${data.description || 'No description provided'}`,
            null,
            webhookUrl
          );
          break;
        case 'TRADE_UPDATES':
          await service.sendTradeNotification(data, webhookUrl);
          break;
        case 'ORDER_UPDATES':
          await service.sendOrderNotification(data, webhookUrl);
          break;
        case 'STRATEGY_UPDATES':
          await service.sendStrategyPerformanceNotification(data, webhookUrl);
          break;
        case 'ERRORS':
          await service.sendErrorNotification(data.message, data.context, webhookUrl);
          break;
        case 'DAILY_SUMMARY':
          await service.sendDailySummary(data, webhookUrl);
          break;
        default:
          console.warn(`Unknown notification type: ${type}`);
      }
    } catch (error) {
      console.error(`Failed to send ${type} notification:`, error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Send new trade notification
   * @param {Object} tradeData - Trade data
   * @param {string} webhookUrl - Required webhook URL
   */
  async notifyNewTrade(tradeData, webhookUrl) {
    await this.sendNotification('TRADES', {
      symbol: tradeData.asset || tradeData.symbol,
      action: tradeData.tradetype || tradeData.action,
      quantity: tradeData.quantity,
      price: tradeData.entryprice || tradeData.price,
      pnl: 0, // New trade has no P&L yet
      strategy: tradeData.strategy_id ? `Strategy ID: ${tradeData.strategy_id}` : 'No Strategy'
    }, webhookUrl);
  }


  /**
   * Send new order notification
   * @param {Object} orderData - Order data
   * @param {string} webhookUrl - Required webhook URL
   */
  async notifyNewOrder(orderData, webhookUrl) {
    await this.sendNotification('ORDERS', {
      symbol: orderData.asset,
      action: orderData.ordertype,
      quantity: orderData.quantity,
      price: orderData.price,
      status: 'COMPLETE',
      orderType: orderData.lotsize ? 'OPTION' : 'STOCK'
    }, webhookUrl);
  }


  /**
   * Send new strategy notification
   * @param {Object} strategyData - Strategy data
   * @param {string} webhookUrl - Required webhook URL
   */
  async notifyNewStrategy(strategyData, webhookUrl) {
    await this.sendNotification('STRATEGIES', {
      name: strategyData.name,
      symbol: strategyData.symbol,
      status: strategyData.status,
      description: strategyData.description
    }, webhookUrl);
  }

  /**
   * Send trade update notification
   * @param {Object} tradeData - Updated trade data
   * @param {string} webhookUrl - Required webhook URL
   */
  async notifyTradeUpdate(tradeData, webhookUrl) {
    await this.sendNotification('TRADE_UPDATES', {
      symbol: tradeData.asset || tradeData.symbol,
      action: tradeData.tradetype || tradeData.action,
      quantity: tradeData.quantity,
      price: tradeData.entryprice || tradeData.price,
      pnl: tradeData.overallreturn || tradeData.pnl || 0,
      strategy: tradeData.strategy_id ? `Strategy ID: ${tradeData.strategy_id}` : 'No Strategy'
    }, webhookUrl);
  }

  /**
   * Send order update notification
   * @param {Object} orderData - Updated order data
   * @param {string} webhookUrl - Required webhook URL
   */
  async notifyOrderUpdate(orderData, webhookUrl) {
    await this.sendNotification('ORDER_UPDATES', {
      symbol: orderData.asset,
      action: orderData.ordertype,
      quantity: orderData.quantity,
      price: orderData.price,
      status: 'UPDATED',
      orderType: orderData.lotsize ? 'OPTION' : 'STOCK'
    }, webhookUrl);
  }

  /**
   * Send strategy update notification
   * @param {Object} strategyData - Updated strategy data
   * @param {string} webhookUrl - Required webhook URL
   */
  async notifyStrategyUpdate(strategyData, webhookUrl) {
    await this.sendNotification('STRATEGY_UPDATES', {
      strategyName: strategyData.name,
      totalPnl: strategyData.realized_pl || 0,
      winRate: 0, // Would need to calculate from trades
      totalTrades: 0, // Would need to count from trades
      period: 'Updated'
    }, webhookUrl);
  }

  /**
   * Send error notification
   * @param {string} errorMessage - Error message
   * @param {string} webhookUrl - Required webhook URL
   * @param {string} context - Context where error occurred
   */
  async notifyError(errorMessage, webhookUrl, context = 'System') {
    await this.sendNotification('ERRORS', {
      message: errorMessage,
      context
    }, webhookUrl);
  }

  /**
   * Send daily summary notification
   * @param {Object} summaryData - Daily summary data
   * @param {string} webhookUrl - Required webhook URL
   */
  async notifyDailySummary(webhookUrl) {
    if (!webhookUrl) {
      // Use SLACK_DAILYSUMMARY_WEBHOOK from environment if no webhook provided
      webhookUrl = process.env.SLACK_DAILYSUMMARY_WEBHOOK;
    }
    
    if (!webhookUrl) {
      throw new Error('Webhook URL is required for daily summary. Please provide webhookUrl parameter or set SLACK_DAILYSUMMARY_WEBHOOK environment variable.');
    }

    try {
      // Fetch comprehensive daily summary data from database
      const summaryData = await dailySummaryService.getDailySummaryData();
      const formattedData = dailySummaryService.formatForSlack(summaryData);
      
      await this.sendNotification('DAILY_SUMMARY', formattedData, webhookUrl);
    } catch (error) {
      console.error('Failed to send daily summary notification:', error);
      throw error;
    }
  }

  /**
   * Create a custom SlackNotificationService with a specific webhook URL
   * @param {string} webhookUrl - The webhook URL to use
   * @returns {SlackNotificationService} - New service instance with the specified webhook
   */
  createCustomService(webhookUrl) {
    return new SlackNotificationService(webhookUrl);
  }

  /**
   * Send notification with custom webhook URL
   * @param {string} type - Type of notification ('trade', 'order', 'strategy', 'error', 'message')
   * @param {Object} data - Notification data
   * @param {string} webhookUrl - Custom webhook URL
   */
  async sendWithCustomWebhook(type, data, webhookUrl) {
    try {
      const customService = new SlackNotificationService(webhookUrl);
      
      switch (type.toLowerCase()) {
        case 'trade':
          await customService.sendTradeNotification(data);
          break;
        case 'order':
          await customService.sendOrderNotification(data);
          break;
        case 'strategy':
          await customService.sendStrategyPerformanceNotification(data);
          break;
        case 'error':
          await customService.sendErrorNotification(data.message, data.context);
          break;
        case 'message':
          await customService.sendMessage(data.message, data.channel);
          break;
        case 'daily':
          await customService.sendDailySummary(data);
          break;
        default:
          console.warn(`Unknown notification type: ${type}`);
      }
    } catch (error) {
      console.error(`Failed to send ${type} notification with custom webhook:`, error);
    }
  }
}

module.exports = new SlackIntegrationHelper();
