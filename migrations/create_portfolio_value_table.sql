CREATE TABLE IF NOT EXISTS portfolio_value (
    id INT NOT NULL AUTO_INCREMENT,
    account_member_name VARCHAR(255) NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    equity_holdings_value DOUBLE DEFAULT 0,
    equity_positions_value DOUBLE DEFAULT 0,
    equity_account_balance DOUBLE DEFAULT 0,
    total_account_value DOUBLE DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_account (account_member_name, account_id)
); 