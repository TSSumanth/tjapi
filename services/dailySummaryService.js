const db = require('../db');
const moment = require('moment');

class DailySummaryService {
  isWeekdayDateStr(dateStr) {
    const m = moment(dateStr, 'YYYY-MM-DD', true);
    if (!m.isValid()) return false;
    const d = m.day();
    return d >= 1 && d <= 5;
  }

  async getHolidayDatesBetween(fromStr, toStr) {
    try {
      const [rows] = await db.pool.query(
        `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS d FROM holidays WHERE date >= ? AND date <= ?`,
        [fromStr, toStr]
      );
      return new Set(rows.map((r) => r.d));
    } catch (error) {
      console.error('Error fetching holidays for session list:', error);
      return new Set();
    }
  }

  isTradingSession(dateStr, holidaySet) {
    if (!this.isWeekdayDateStr(dateStr)) return false;
    return !holidaySet.has(dateStr);
  }

  /**
   * Walk backward from anchor (inclusive): trading weekdays not in holidays.
   */
  async listSessionsPaginated(anchorEndStr, limit, offset, maxScanDays = 500) {
    const startScan = moment(anchorEndStr, 'YYYY-MM-DD')
      .subtract(maxScanDays, 'days')
      .format('YYYY-MM-DD');
    const holidaySet = await this.getHolidayDatesBetween(startScan, anchorEndStr);

    let cursor = moment(anchorEndStr, 'YYYY-MM-DD');
    let skipped = 0;
    const out = [];
    let scanned = 0;

    while (scanned < maxScanDays && out.length < limit) {
      const ds = cursor.format('YYYY-MM-DD');
      if (this.isTradingSession(ds, holidaySet)) {
        if (skipped < offset) {
          skipped += 1;
        } else {
          out.push(ds);
        }
      }
      cursor = cursor.clone().subtract(1, 'day');
      scanned += 1;
      if (cursor.year() < 1990) break;
    }
    return out;
  }

  /**
   * Trading sessions from `from` through `to` (inclusive), ascending.
   */
  async listSessionsInRange(fromStr, toStr) {
    const holidaySet = await this.getHolidayDatesBetween(fromStr, toStr);
    const out = [];
    let c = moment(fromStr, 'YYYY-MM-DD');
    const end = moment(toStr, 'YYYY-MM-DD');
    while (c.isSameOrBefore(end, 'day')) {
      const ds = c.format('YYYY-MM-DD');
      if (this.isTradingSession(ds, holidaySet)) {
        out.push(ds);
      }
      c = c.clone().add(1, 'day');
    }
    return out;
  }

  /**
   * @param {string} [reportDate] - YYYY-MM-DD; defaults to today
   */
  async getDailySummaryData(reportDate) {
    try {
      const date =
        reportDate && moment(reportDate, 'YYYY-MM-DD', true).isValid()
          ? reportDate
          : moment().format('YYYY-MM-DD');

      const m = moment(date, 'YYYY-MM-DD');
      const year = m.year();
      const month = m.month() + 1;

      const [
        openTrades,
        openedTrades,
        closedTrades,
        monthlyPerformance,
        todayOrders,
        openStrategies,
        closedStrategies,
        todayExpenses
      ] = await Promise.all([
        this.getOpenTradesAsOf(date),
        this.getTradesOpenedOnDate(date),
        this.getTradesClosedOnDate(date),
        this.getMonthlyPerformanceForYearMonth(year, month),
        this.getTodayOrders(date),
        this.getOpenStrategiesAsOf(date),
        this.getStrategiesClosedOnDate(date),
        this.getTodayExpenses(date)
      ]);

      return {
        date,
        openTrades,
        openedTrades,
        closedTrades,
        monthlyPerformance,
        todayOrders,
        openStrategies,
        closedStrategies,
        todayExpenses,
        summary: {
          totalOpenTrades: openTrades.length,
          totalOpenedTrades: openedTrades.length,
          totalClosedTrades: closedTrades.length,
          totalTodayOrders: todayOrders.length,
          totalOpenStrategies: openStrategies.length,
          totalClosedStrategies: closedStrategies.length,
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
   * Trades still open at end of session `asOfDate` (EOD): entered on/before date, exit after date or none.
   */
  async getOpenTradesAsOf(asOfDate) {
    try {
      const [stockTrades] = await db.pool.query(
        `
        SELECT 
          tradeid,
          asset,
          quantity,
          openquantity,
          entryprice as price,
          entrydate as date,
          exitdate,
          notes,
          tags,
          'STOCK' as type
        FROM stock_trades 
        WHERE entrydate IS NOT NULL
          AND DATE(entrydate) <= ?
          AND (exitdate IS NULL OR DATE(exitdate) > ?)
        ORDER BY entrydate DESC
        LIMIT 10
      `,
        [asOfDate, asOfDate]
      );

      const [optionTrades] = await db.pool.query(
        `
        SELECT 
          tradeid,
          asset,
          quantity,
          openquantity,
          premiumamount as price,
          entrydate as date,
          exitdate,
          notes,
          tags,
          lotsize,
          'OPTION' as type
        FROM option_trades 
        WHERE entrydate IS NOT NULL
          AND DATE(entrydate) <= ?
          AND (exitdate IS NULL OR DATE(exitdate) > ?)
        ORDER BY entrydate DESC
        LIMIT 10
      `,
        [asOfDate, asOfDate]
      );

      const mapRow = (trade) => ({
        ...trade,
        currentPnL: 0,
        unrealizedPnL: 0
      });

      return [...stockTrades.map(mapRow), ...optionTrades.map(mapRow)];
    } catch (error) {
      console.error('Error fetching open trades as-of date:', error);
      return [];
    }
  }

  /**
   * New positions with entry date on calendar day `d`.
   */
  async getTradesOpenedOnDate(d) {
    try {
      const [stockTrades] = await db.pool.query(
        `
        SELECT 
          tradeid,
          asset,
          quantity,
          entryprice as price,
          entrydate as date,
          exitdate,
          'STOCK' as type
        FROM stock_trades 
        WHERE entrydate IS NOT NULL AND DATE(entrydate) = ?
        ORDER BY entrydate DESC
        LIMIT 10
      `,
        [d]
      );

      const [optionTrades] = await db.pool.query(
        `
        SELECT 
          tradeid,
          asset,
          quantity,
          premiumamount as price,
          entrydate as date,
          exitdate,
          lotsize,
          'OPTION' as type
        FROM option_trades 
        WHERE entrydate IS NOT NULL AND DATE(entrydate) = ?
        ORDER BY entrydate DESC
        LIMIT 10
      `,
        [d]
      );

      return [...(stockTrades || []), ...(optionTrades || [])];
    } catch (error) {
      console.error('Error fetching trades opened on date:', error);
      return [];
    }
  }

  async getTradesClosedOnDate(d) {
    try {
      const [stockTrades] = await db.pool.query(
        `
        SELECT 
          tradeid,
          asset,
          quantity,
          entryprice as price,
          entrydate as date,
          exitdate,
          overallreturn,
          'STOCK' as type
        FROM stock_trades 
        WHERE status = 'CLOSED' AND exitdate IS NOT NULL AND DATE(exitdate) = ?
        ORDER BY exitdate DESC
        LIMIT 10
      `,
        [d]
      );

      const [optionTrades] = await db.pool.query(
        `
        SELECT 
          tradeid,
          asset,
          quantity,
          premiumamount as price,
          entrydate as date,
          exitdate,
          overallreturn,
          lotsize,
          'OPTION' as type
        FROM option_trades 
        WHERE status = 'CLOSED' AND exitdate IS NOT NULL AND DATE(exitdate) = ?
        ORDER BY exitdate DESC
        LIMIT 10
      `,
        [d]
      );

      return [...(stockTrades || []), ...(optionTrades || [])];
    } catch (error) {
      console.error('Error fetching trades closed on date:', error);
      return [];
    }
  }

  async getMonthlyPerformanceForYearMonth(currentYear, currentMonth) {
    try {
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
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          expectedReturn,
          actualReturn,
          variance,
          accountBalance: data.account_balance || 0,
          monthName: data.month_name || '',
          year: data.year || currentYear,
          month: data.month || currentMonth
        };
      }

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
    }
  }

  async getTodayOrders(today) {
    try {
      const [stockOrders] = await db.pool.query(
        `
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
      `,
        [today]
      );

      const [optionOrders] = await db.pool.query(
        `
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
      `,
        [today]
      );

      return [...stockOrders, ...optionOrders];
    } catch (error) {
      console.error('Error fetching today orders:', error);
      return [];
    }
  }

  async getTodayExpenses(today) {
    try {
      const [rows] = await db.pool.query(
        `SELECT stt, exchange_charges, brokerage, others, notes
         FROM daily_trading_expenses
         WHERE expense_date = ?`,
        [today]
      );
      if (!rows || rows.length === 0) {
        return null;
      }
      const r = rows[0];
      return {
        stt: Number(r.stt),
        exchange_charges: Number(r.exchange_charges),
        brokerage: Number(r.brokerage),
        others: Number(r.others),
        notes: r.notes || null
      };
    } catch (error) {
      console.error('Error fetching today expenses:', error);
      return null;
    }
  }

  /**
   * Strategies open at EOD asOfDate: created on/before date; not closed yet on that calendar day.
   * Legacy: CLOSE without closed_at excluded from historical open (unknown close date).
   */
  async getOpenStrategiesAsOf(asOfDate) {
    try {
      const [strategies] = await db.pool.query(
        `
        SELECT 
          id,
          name,
          description,
          symbol,
          symbol_ltp,
          realized_pl,
          unrealized_pl,
          expenses,
          created_at,
          status
        FROM strategies 
        WHERE DATE(created_at) <= ?
          AND (
            (closed_at IS NULL AND UPPER(TRIM(status)) = 'OPEN')
            OR (closed_at IS NOT NULL AND DATE(closed_at) > ?)
          )
        ORDER BY created_at DESC
        LIMIT 10
      `,
        [asOfDate, asOfDate]
      );

      return strategies || [];
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        return this.getOpenStrategiesLegacyAsOf(asOfDate);
      }
      console.error('Error fetching open strategies as-of date:', error);
      return [];
    }
  }

  /**
   * Fallback when strategies.closed_at is missing: only rows still OPEN today, created by asOfDate.
   * Historical closes while still OPEN in DB cannot be reconstructed without closed_at.
   */
  async getOpenStrategiesLegacyAsOf(asOfDate) {
    try {
      const [strategies] = await db.pool.query(
        `
        SELECT id, name, description, symbol, symbol_ltp, realized_pl, unrealized_pl, expenses, created_at, status
        FROM strategies 
        WHERE status = 'OPEN' AND DATE(created_at) <= ?
        ORDER BY created_at DESC
        LIMIT 10
      `,
        [asOfDate]
      );
      return strategies || [];
    } catch (error) {
      console.error('Error fetching open strategies (legacy as-of):', error);
      return [];
    }
  }

  /**
   * Requires strategies.closed_at (see sql/add_strategies_closed_at.sql).
   */
  async getStrategiesClosedOnDate(d) {
    try {
      const [rows] = await db.pool.query(
        `
        SELECT id, name, description, status, realized_pl, closed_at
        FROM strategies
        WHERE UPPER(TRIM(status)) IN ('CLOSE', 'CLOSED')
          AND closed_at IS NOT NULL
          AND DATE(closed_at) = ?
        ORDER BY closed_at DESC
        LIMIT 10
      `,
        [d]
      );
      return rows || [];
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        return [];
      }
      console.error('Error fetching strategies closed on date:', error);
      return [];
    }
  }

  formatForSlack(data) {
    const {
      date,
      openTrades,
      openedTrades,
      closedTrades,
      monthlyPerformance,
      todayOrders,
      closedStrategies,
      summary,
      todayExpenses
    } = data;

    return {
      date,
      todayExpenses: todayExpenses || null,
      summary: {
        totalOpenTrades: summary.totalOpenTrades,
        totalOpenedTrades: summary.totalOpenedTrades,
        totalClosedTrades: summary.totalClosedTrades,
        totalTodayOrders: summary.totalTodayOrders,
        totalOpenStrategies: summary.totalOpenStrategies,
        totalClosedStrategies: summary.totalClosedStrategies,
        monthlyPnL: monthlyPerformance.totalPnL,
        monthlyTrades: monthlyPerformance.totalTrades,
        winRate: monthlyPerformance.winRate
      },
      openTrades: openTrades.slice(0, 5),
      openedTrades: openedTrades.slice(0, 5),
      closedTrades: closedTrades.slice(0, 5),
      todayOrders: todayOrders.slice(0, 5),
      closedStrategies: closedStrategies.slice(0, 5),
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

  /**
   * Full payload for UI (same source as Slack, larger lists).
   */
  formatForUIPreview(data) {
    const slack = this.formatForSlack(data);
    return {
      ...slack,
      openTrades: data.openTrades,
      openedTrades: data.openedTrades,
      closedTrades: data.closedTrades,
      todayOrders: data.todayOrders,
      closedStrategies: data.closedStrategies,
      openStrategies: data.openStrategies,
      todayExpenses: data.todayExpenses
    };
  }
}

module.exports = new DailySummaryService();
