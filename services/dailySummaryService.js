const db = require('../db');
const moment = require('moment');

class DailySummaryService {
  /**
   * Get comprehensive daily summary data using direct database queries
   * @returns {Promise<Object>} - Daily summary data
   */
  async getDailySummaryData() {
    try {
      const today = moment().format('YYYY-MM-DD');

      // Fetch all data in parallel using direct database queries
      const [
        openTrades,
        monthlyPerformance,
        todayOrders,
        openStrategies,
        strategyPlSummary
      ] = await Promise.all([
        this.getOpenTrades(),
        this.getMonthlyPerformance(),
        this.getTodayOrders(today),
        this.getOpenStrategies(),
        this.getStrategyPlSummary()
      ]);

      return {
        date: today,
        openTrades,
        monthlyPerformance,
        todayOrders,
        openStrategies,
        strategyPlSummary,
        summary: {
          totalOpenTrades: openTrades.length,
          totalTodayOrders: todayOrders.length,
          totalOpenStrategies: openStrategies.length,
          monthlyPnL: monthlyPerformance.totalPnL || 0,
          monthlyTrades: monthlyPerformance.totalTrades || 0
        }
      };
    } catch (error) {
      console.error('Error fetching daily summary data:', error);
      throw error;
    }
  }

  /**
   * Get all open trades using direct database queries
   * @returns {Promise<Array>} - Array of open trades
   */
  async getOpenTrades() {
    try {
      // Get open stock trades directly from database
      const [stockTrades] = await db.pool.query(`
        SELECT 
          tradeid,
          asset,
          quantity,
          entryprice as price,
          entrydate as date,
          notes,
          tags,
          'STOCK' as type
        FROM stock_trades 
        WHERE status IS NULL OR status != 'CLOSED'
        ORDER BY entrydate DESC
        LIMIT 10
      `);

      // Get open option trades directly from database
      const [optionTrades] = await db.pool.query(`
        SELECT 
          tradeid,
          asset,
          quantity,
          premiumamount as price,
          entrydate as date,
          notes,
          tags,
          lotsize,
          'OPTION' as type
        FROM option_trades 
        WHERE status = 'OPEN'
        ORDER BY entrydate DESC
        LIMIT 10
      `);

      // Add calculated P/L placeholders
      const formattedStockTrades = stockTrades.map(trade => ({
        ...trade,
        currentPnL: 0, // Placeholder - would need current market price calculation
        unrealizedPnL: 0 // Placeholder - would need current market price calculation
      }));

      const formattedOptionTrades = optionTrades.map(trade => ({
        ...trade,
        currentPnL: 0, // Placeholder - would need current market price calculation
        unrealizedPnL: 0 // Placeholder - would need current market price calculation
      }));

      return [...formattedStockTrades, ...formattedOptionTrades];
    } catch (error) {
      console.error('Error fetching open trades:', error);
      return [];
    }
  }

  /**
   * Get current month performance using direct database query
   * @returns {Promise<Object>} - Monthly performance data
   */
  async getMonthlyPerformance() {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // Get current month performance data directly from database
      const [rows] = await db.pool.query(
        'SELECT * FROM monthly_performance WHERE year = ? AND month = ?', 
        [currentYear, currentMonth]
      );
      
      if (rows && rows.length > 0) {
        const data = rows[0];
        const expectedReturn = data.expected_return || 0;
        const actualReturn = data.actual_return || 0;
        const variance = expectedReturn - actualReturn;
        
        return {
          totalPnL: actualReturn,
          totalTrades: 0, // This would need to be calculated separately
          winningTrades: 0, // This would need to be calculated separately
          losingTrades: 0, // This would need to be calculated separately
          winRate: 0, // This would need to be calculated separately
          expectedReturn: expectedReturn,
          actualReturn: actualReturn,
          variance: variance,
          accountBalance: data.account_balance || 0,
          monthName: data.month_name || '',
          year: data.year || currentYear,
          month: data.month || currentMonth
        };
      }
      
      // If no data found, return default values
      return { 
        totalPnL: 0, 
        totalTrades: 0, 
        winningTrades: 0, 
        losingTrades: 0, 
        winRate: 0,
        expectedReturn: 0,
        actualReturn: 0,
        variance: 0,
        accountBalance: 0,
        monthName: '',
        year: currentYear,
        month: currentMonth
      };
    } catch (error) {
      console.error('Error fetching monthly performance:', error);
      return { totalPnL: 0, totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0 };
    }
  }

  /**
   * Get orders created today using direct database queries
   * @param {string} today - Today's date
   * @returns {Promise<Array>} - Array of today's orders
   */
  async getTodayOrders(today) {
    try {
      // Get today's stock orders directly from database
      const [stockOrders] = await db.pool.query(`
        SELECT 
          id,
          asset,
          ordertype,
          quantity,
          price,
          date,
          tradeid,
          notes,
          tags,
          'STOCK' as type
        FROM stock_orders 
        WHERE DATE(date) = ?
        ORDER BY date DESC
        LIMIT 10
      `, [today]);

      // Get today's option orders directly from database
      const [optionOrders] = await db.pool.query(`
        SELECT 
          id,
          asset,
          ordertype,
          quantity,
          price,
          date,
          tradeid,
          notes,
          tags,
          lotsize,
          'OPTION' as type
        FROM option_orders 
        WHERE DATE(date) = ?
        ORDER BY date DESC
        LIMIT 10
      `, [today]);

      return [...stockOrders, ...optionOrders];
    } catch (error) {
      console.error('Error fetching today orders:', error);
      return [];
    }
  }

  /**
   * Get open regular strategies using direct database query
   * @returns {Promise<Array>} - Array of open strategies
   */
  async getOpenStrategies() {
    try {
      // Get active strategies directly from database
      const [strategies] = await db.pool.query(`
        SELECT 
          id,
          name,
          description,
          created_at,
          status
        FROM strategies 
        WHERE status = 'OPEN'
        ORDER BY created_at DESC
        LIMIT 10
      `);

      return strategies || [];
    } catch (error) {
      console.error('Error fetching open strategies:', error);
      return [];
    }
  }

  /**
   * Get strategy P/L summary - latest P/L data for each strategy
   * @returns {Promise<Array>} - Array of strategy P/L data with latest records
   */
  async getStrategyPlSummary() {
    try {
      // First get all active strategies
      const openStrategies = await this.getOpenStrategies();
      
      if (openStrategies.length === 0) {
        return [];
      }

      // Get latest P/L data for each strategy using direct database query
      // since we need only the latest record, not all history
      const strategyPlPromises = openStrategies.map(async (strategy) => {
        try {
          // Get the latest P/L record for this strategy
          const [latestPlRecord] = await db.pool.query(`
            SELECT 
              total_pl,
              timestamp,
              market_price
            FROM strategy_pl_history 
            WHERE strategy_id = ? 
            ORDER BY timestamp DESC, id DESC 
            LIMIT 1
          `, [strategy.id]);

          if (latestPlRecord && latestPlRecord.length > 0) {
            const latestRecord = latestPlRecord[0];
            return {
              id: strategy.id,
              name: strategy.name,
              latestPnL: latestRecord.total_pl || 0,
              latestDate: latestRecord.timestamp,
              marketPrice: latestRecord.market_price || 0
            };
          }
          
          return {
            id: strategy.id,
            name: strategy.name,
            latestPnL: 0,
            latestDate: null,
            notes: ''
          };
        } catch (error) {
          console.error(`Error fetching latest P/L for strategy ${strategy.id}:`, error);
          return {
            id: strategy.id,
            name: strategy.name,
            latestPnL: 0,
            latestDate: null,
            notes: ''
          };
        }
      });

      const strategyPlResults = await Promise.all(strategyPlPromises);
      
      // Sort by latest P/L descending
      return strategyPlResults.sort((a, b) => b.latestPnL - a.latestPnL);
    } catch (error) {
      console.error('Error fetching strategy P/L summary:', error);
      return [];
    }
  }

  /**
   * Format daily summary for Slack notification
   * @param {Object} data - Daily summary data
   * @returns {Object} - Formatted data for Slack
   */
  formatForSlack(data) {
    const { date, openTrades, monthlyPerformance, todayOrders, openStrategies, strategyPlSummary, summary } = data;

    return {
      date,
      summary: {
        totalOpenTrades: summary.totalOpenTrades,
        totalTodayOrders: summary.totalTodayOrders,
        totalOpenStrategies: summary.totalOpenStrategies,
        monthlyPnL: monthlyPerformance.totalPnL,
        monthlyTrades: monthlyPerformance.totalTrades,
        winRate: monthlyPerformance.winRate
      },
      openTrades: openTrades.slice(0, 5), // Top 5 open trades
      todayOrders: todayOrders.slice(0, 5), // Top 5 today's orders
      topStrategies: strategyPlSummary.slice(0, 3), // Top 3 strategies by P/L
      monthlyPerformance: {
        monthName: monthlyPerformance.monthName,
        year: monthlyPerformance.year,
        expectedReturn: monthlyPerformance.expectedReturn,
        actualReturn: monthlyPerformance.actualReturn,
        variance: monthlyPerformance.variance,
        accountBalance: monthlyPerformance.accountBalance,
        totalPnL: monthlyPerformance.totalPnL,
        winRate: monthlyPerformance.winRate
      }
    };
  }
}

module.exports = new DailySummaryService();
