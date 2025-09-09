const slackNotificationService = require("../services/slackNotificationService");
const slackHelper = require("../services/slackIntegrationHelper");

exports.sendMessage = async (req, res) => {
  try {
    const { message, channel, webhookUrl } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL is required'
      });
    }

    const success = await slackNotificationService.sendMessage(message, channel, webhookUrl);
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Slack message sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send Slack message'
      });
    }
    
  } catch (error) {
    console.error('Error sending Slack message:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

exports.sendTradeNotification = async (req, res) => {
  try {
    const { symbol, action, quantity, price, pnl, strategy } = req.body;
    
    // Validate required fields
    if (!symbol || !action || !quantity || !price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, action, quantity, price'
      });
    }
    
    const success = await slackNotificationService.sendTradeNotification({
      symbol,
      action,
      quantity,
      price,
      pnl: pnl || 0,
      strategy: strategy || 'N/A'
    });
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Trade notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send trade notification'
      });
    }
    
  } catch (error) {
    console.error('Error sending trade notification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

exports.sendOrderNotification = async (req, res) => {
  try {
    const { symbol, action, quantity, price, status, orderType } = req.body;
    
    // Validate required fields
    if (!symbol || !action || !quantity || !price || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, action, quantity, price, status'
      });
    }
    
    const success = await slackNotificationService.sendOrderNotification({
      symbol,
      action,
      quantity,
      price,
      status,
      orderType: orderType || 'STOCK'
    });
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Order notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send order notification'
      });
    }
    
  } catch (error) {
    console.error('Error sending order notification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

exports.sendStrategyNotification = async (req, res) => {
  try {
    const { strategyName, totalPnl, winRate, totalTrades, period } = req.body;
    
    // Validate required fields
    if (!strategyName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: strategyName'
      });
    }
    
    const success = await slackNotificationService.sendStrategyPerformanceNotification({
      strategyName,
      totalPnl: totalPnl || 0,
      winRate: winRate || 0,
      totalTrades: totalTrades || 0,
      period: period || 'Current'
    });
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Strategy notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send strategy notification'
      });
    }
    
  } catch (error) {
    console.error('Error sending strategy notification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

exports.sendErrorNotification = async (req, res) => {
  try {
    const { errorMessage, context } = req.body;
    
    if (!errorMessage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: errorMessage'
      });
    }
    
    const success = await slackNotificationService.sendErrorNotification(
      errorMessage,
      context || 'System'
    );
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Error notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send error notification'
      });
    }
    
  } catch (error) {
    console.error('Error sending error notification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

exports.sendDailySummary = async (req, res) => {
  try {
    const { date, totalPnl, totalTrades, winningTrades, losingTrades, topStrategy } = req.body;
    
    const success = await slackNotificationService.sendDailySummary({
      date: date || new Date().toISOString().split('T')[0],
      totalPnl: totalPnl || 0,
      totalTrades: totalTrades || 0,
      winningTrades: winningTrades || 0,
      losingTrades: losingTrades || 0,
      topStrategy: topStrategy || 'N/A'
    });
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Daily summary sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send daily summary'
      });
    }
    
  } catch (error) {
    console.error('Error sending daily summary:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return res.status(200).json({
        configured: false,
        message: 'Slack webhook URL not configured in environment variables'
      });
    }
    
    // Test if webhook URL is properly formatted
    const isValidUrl = webhookUrl.startsWith('https://hooks.slack.com/services/');
    
    res.status(200).json({
      configured: true,
      webhookConfigured: isValidUrl,
      message: isValidUrl ? 'Slack webhook URL is properly configured' : 'Slack webhook URL format appears invalid'
    });
    
  } catch (error) {
    console.error('Error checking Slack status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * Send daily summary notification
 * GET /api/slack/daily-summary
 */
exports.sendDailySummary = async (req, res) => {
  try {
    const { webhookUrl } = req.query;
    
    // Use provided webhook or SLACK_DAILYSUMMARY_WEBHOOK from environment
    const finalWebhookUrl = webhookUrl || process.env.SLACK_DAILYSUMMARY_WEBHOOK;
    
    if (!finalWebhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL required',
        message: 'Please provide webhookUrl query parameter or set SLACK_DAILYSUMMARY_WEBHOOK environment variable'
      });
    }

    await slackHelper.notifyDailySummary(finalWebhookUrl);
    
    res.status(200).json({
      success: true,
      message: 'Daily summary notification sent successfully',
      webhookUsed: finalWebhookUrl.substring(0, 50) + '...'
    });
    
  } catch (error) {
    console.error('Error sending daily summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send daily summary',
      details: error.message
    });
  }
};

/**
 * Test the scheduled daily summary (for development/testing)
 * GET /api/slack/test-daily-summary
 */
exports.testDailySummary = async (req, res) => {
  try {
    
    const { webhookUrl } = req.query;
    const finalWebhookUrl = webhookUrl || process.env.SLACK_DAILYSUMMARY_WEBHOOK;
    
    if (!finalWebhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL required',
        message: 'Please provide webhookUrl query parameter or set SLACK_DAILYSUMMARY_WEBHOOK environment variable'
      });
    }

    await slackHelper.notifyDailySummary(finalWebhookUrl);
    
    res.status(200).json({
      success: true,
      message: 'Daily summary test completed successfully',
      webhookUsed: finalWebhookUrl.substring(0, 50) + '...',
      note: 'This is a test run of the daily summary functionality'
    });
    
  } catch (error) {
    console.error('Error testing daily summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test daily summary',
      details: error.message
    });
  }
};

