const db = require("./../db");

exports.createTag = async (req, res) => {
  const { name, description } = req.body;
  try {
    // Check for duplicate tag
    const [existingTags] = await db.pool.query(
      'SELECT name FROM tags WHERE name = ?',
      [name.toUpperCase()]
    );

    if (existingTags.length > 0) {
      return res.status(400).json({ message: "Duplicate Tag not allowed!" });
    }

    // Insert new tag
    const [result] = await db.pool.query(
      'INSERT INTO tags (name, description) VALUES (?, ?)',
      [name.toUpperCase(), description]
    );

    if (result.affectedRows === 1) {
      return res.status(201).json({ message: "Tag added successfully!" });
    }

    res.status(500).json({
      error: "Unable to Create new tag: " + name.toUpperCase()
    });
  } catch (error) {
    console.error("Error creating tag:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.getTags = async (req, res) => {
  try {
    let { name } = req.query;
    if (name === undefined) name = "";

    const query = `
      SELECT * FROM tags  
      WHERE LOWER(name) LIKE    
        CASE  
          WHEN ? = '' THEN '%'  
          ELSE LOWER(CONCAT('%', ?, '%'))  
        END
    `;

    const [results] = await db.pool.query(query, [name, name]);
    console.log('Tags found:', results);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.getTag = async (req, res) => {
  try {
    let { name } = req.params;
    name = name.toUpperCase();

    const [results] = await db.pool.query(
      'SELECT * FROM tags WHERE name = ?',
      [name]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "Tag not found: " + name });
    }

    res.status(200).json(results[0]);
  } catch (error) {
    console.error("Error fetching tag:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.updateTag = async (req, res) => {
  try {
    const { name } = req.params;
    let tagname = req.body.name;
    let tagdescription = req.body.description;

    // Build the query string to update the tag
    let updateFields = ["name", "description"];
    let updateValues = [];
    if (tagname === undefined) {
      updateValues.push(name.toUpperCase(), tagdescription);
    } else {
      updateValues.push(tagname.toUpperCase(), tagdescription);
    }

    const sqlQuery = `
      UPDATE tags
      SET ${updateFields.map((field) => `${field} = ?`).join(", ")}
      WHERE name = ?
    `;
    updateValues.push(name.toUpperCase());

    const [result] = await db.pool.query(sqlQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Tag not found" });
    }

    if (result.affectedRows === 1) {
      return res.status(200).json({ message: "Tag updated successfully" });
    }

    res.status(500).json({ error: "Unable to update tag: " + name });
  } catch (error) {
    console.error("Error updating tag:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.deleteTag = async (req, res) => {
  try {
    const { name } = req.params;

    const [result] = await db.pool.query(
      'DELETE FROM tags WHERE name = ?',
      [name.toUpperCase()]
    );

    if (result.affectedRows === 1) {
      return res.status(204).json({});
    }

    return res.status(404).json({
      error: `No record available to delete with name: ${name.toUpperCase()}`
    });
  } catch (error) {
    console.error("Error deleting tag:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
