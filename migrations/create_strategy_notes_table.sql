CREATE TABLE IF NOT EXISTS strategy_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  strategy_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
); 