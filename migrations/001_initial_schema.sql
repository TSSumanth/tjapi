-- Create marketanalysis table
CREATE TABLE IF NOT EXISTS marketanalysis (
    date DATE NOT NULL,
    premarket_analysis LONGTEXT,
    market_movement LONGTEXT,
    postmarket_analysis LONGTEXT,
    event_day TINYINT NOT NULL,
    event_description LONGTEXT,
    premarket_expectation LONGTEXT,
    id INT NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (id, date)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(45) DEFAULT NULL,
    description LONGTEXT,
    PRIMARY KEY (id),
    UNIQUE KEY id_UNIQUE (id)
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create strategies table
CREATE TABLE IF NOT EXISTS strategies (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(45) NOT NULL,
    description TEXT,
    stock_trades JSON DEFAULT NULL,
    option_trades JSON DEFAULT NULL,
    status VARCHAR(45) NOT NULL,
    created_at DATETIME NOT NULL,
    symbol VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY name_UNIQUE (id)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create strategy_notes table
CREATE TABLE IF NOT EXISTS strategy_notes (
    id INT NOT NULL AUTO_INCREMENT,
    strategy_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY strategy_id (strategy_id),
    CONSTRAINT strategy_notes_ibfk_1 FOREIGN KEY (strategy_id) REFERENCES strategies (id) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create stock_trades table
CREATE TABLE IF NOT EXISTS stock_trades (
    tradeid VARCHAR(45) NOT NULL,
    asset VARCHAR(45) NOT NULL,
    quantity INT NOT NULL,
    tradetype VARCHAR(45) NOT NULL,
    entryprice DOUBLE NOT NULL,
    capitalused DOUBLE NOT NULL,
    entrydate DATETIME NOT NULL,
    openquantity INT NOT NULL,
    closedquantity INT NOT NULL,
    exitaverageprice DOUBLE DEFAULT NULL,
    finalexitprice DOUBLE DEFAULT NULL,
    status VARCHAR(45) DEFAULT NULL,
    overallreturn DOUBLE DEFAULT NULL,
    exitdate DATETIME DEFAULT NULL,
    lastmodifieddate DATETIME NOT NULL,
    strategy_id INT DEFAULT NULL,
    notes LONGTEXT,
    tags VARCHAR(45) DEFAULT NULL,
    ltp DECIMAL(10,2) DEFAULT NULL,
    PRIMARY KEY (tradeid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create option_trades table
CREATE TABLE IF NOT EXISTS option_trades (
    tradeid VARCHAR(45) NOT NULL,
    asset VARCHAR(45) NOT NULL,
    lotsize INT NOT NULL,
    quantity INT NOT NULL,
    tradetype VARCHAR(45) NOT NULL,
    entryprice DOUBLE NOT NULL,
    premiumamount DOUBLE NOT NULL,
    entrydate DATETIME DEFAULT NULL,
    status VARCHAR(45) NOT NULL,
    openquantity INT NOT NULL,
    closedquantity INT DEFAULT '0',
    exitaverageprice DOUBLE DEFAULT '0',
    finalexitprice DOUBLE DEFAULT '0',
    exitdate DATETIME DEFAULT NULL,
    overallreturn DOUBLE DEFAULT NULL,
    lastmodifieddate DATETIME DEFAULT NULL,
    strategy_id INT DEFAULT NULL,
    notes LONGTEXT,
    tags VARCHAR(45) DEFAULT NULL,
    strikeprize INT NOT NULL,
    ltp DECIMAL(10,2) DEFAULT NULL,
    PRIMARY KEY (tradeid),
    UNIQUE KEY tradeid_UNIQUE (tradeid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create stock_orders table
CREATE TABLE IF NOT EXISTS stock_orders (
    id INT NOT NULL AUTO_INCREMENT,
    asset VARCHAR(45) NOT NULL,
    ordertype VARCHAR(45) NOT NULL,
    quantity INT NOT NULL,
    price DOUBLE NOT NULL,
    date DATETIME NOT NULL,
    tradeid VARCHAR(45) DEFAULT NULL,
    notes LONGTEXT,
    tags VARCHAR(45) DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT stock_orders_ibfk_1 FOREIGN KEY (tradeid) REFERENCES stock_trades (tradeid) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create option_orders table
CREATE TABLE IF NOT EXISTS option_orders (
    id INT NOT NULL AUTO_INCREMENT,
    asset VARCHAR(45) NOT NULL,
    lotsize INT DEFAULT NULL,
    ordertype VARCHAR(45) NOT NULL,
    quantity INT NOT NULL,
    price DOUBLE NOT NULL,
    date DATETIME NOT NULL,
    notes LONGTEXT,
    tags VARCHAR(45) DEFAULT NULL,
    tradeid VARCHAR(45) NOT NULL,
    PRIMARY KEY (id, tradeid),
    CONSTRAINT option_orders_ibfk_1 FOREIGN KEY (tradeid) REFERENCES option_trades (tradeid) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create action_items table
CREATE TABLE IF NOT EXISTS action_items (
    id INT NOT NULL AUTO_INCREMENT,
    description LONGTEXT NOT NULL,
    status VARCHAR(45) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create profit_loss_report table
CREATE TABLE IF NOT EXISTS profit_loss_report (
    date DATE NOT NULL,
    stocks_realised INT NOT NULL DEFAULT '0',
    stocks_unrealised INT NOT NULL DEFAULT '0',
    fo_realised INT NOT NULL DEFAULT '0',
    fo_unrealised INT NOT NULL DEFAULT '0',
    stock_pl INT DEFAULT '0',
    fo_pl INT DEFAULT '0',
    total_pl INT DEFAULT '0',
    PRIMARY KEY (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci; 