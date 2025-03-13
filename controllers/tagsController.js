const db = require("./../db");

exports.createTag = (req, res) => {
  const { name, description } = req.body;
  db.query(
    `Select name from tags where name = ?`,
    [name.toUpperCase()],
    (err, results) => {
      if (results.length > 0) {
        return res.status(500).json({ message: "Duplicate Tag not allowed!" });
      }
      const sql = "INSERT INTO tags (name, description) VALUES (?, ?)";
      db.query(
        sql,
        [name.toUpperCase(), description],
        (err1, result1) => {
          if (err1) {
            return res.status(500).json(err1);
          }
          if (result1.affectedRows == 1)
            return res.status(201).json({ message: "Tag added successfully!" });
          res.status(500).json({
            error: "Unable to Create new tag: " + name.toUpperCase(),
          });
        }
      );
    }
  );
};

exports.getTags = (req, res) => {
  let { name } = req.query;
  if (name == undefined)
    name = ""
  let query = `SELECT * FROM tags  
                WHERE LOWER(name) LIKE    
                  CASE  
                      WHEN ? = '' THEN '%'  
                      ELSE LOWER(CONCAT('%', ?, '%'))  
                  END;`
  db.query(query, [name, name], (err, results) => {
    if (err) return res.status(500).json(err);
    console.log(results)
    res.status(200).json(results);
  });

};

exports.getTag = (req, res) => {
  let { name } = req.params;
  name = name.toUpperCase();
  try {
    db.query("SELECT * FROM tags WHERE name = ?", [name], (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0) {
        return res.status(404).json({ message: "Tag not found: " + name });
      }
      res.status(200).json(results[0]);
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateTag = (req, res) => {
  const { name } = req.params;
  let tagname = req.body.name;
  let tagdescription = req.body.description;
  // Build the query string to update the trade
  let updateFields = ["name", "description"];
  let updateValues = [];
  if (tagname == undefined)
    updateValues.push(name.toUpperCase(), tagdescription);
  else updateValues.push(tagname.toUpperCase(), tagdescription);

  const sqlQuery = `
            UPDATE tags
            SET ${updateFields.map((field) => `${field} = ?`).join(", ")}
            WHERE name = ?
        `;
  updateValues.push(name.toUpperCase());
  try {
    // Execute the query
    const result = db.execute(sqlQuery, updateValues, (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.affectedRows == 0) {
        return res.status(404).json({ message: "Tag not found" });
      }
      if (results.affectedRows == 1) {
        return res.status(200).json({ message: "Tag updated successfully" });
      }
      res.status(500).json({ error: "Unable to update tag: " + name });
    });
  } catch (error) {
    console.error("Error updating analysis:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteTag = (req, res) => {
  const { name } = req.params;

  try {
    db.query(
      "Delete FROM tags WHERE name = ?",
      [name.toUpperCase()],
      (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.affectedRows == 1) return res.status(204).json({});
        else
          return res.status(500).json({
            error: `No record available to delete with name:${name.toUpperCase()}`,
          });
      }
    );
  } catch (error) {
    console.error("Error deleting Analysis:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
