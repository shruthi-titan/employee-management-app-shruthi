const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// Database setup
const db = new sqlite3.Database('./employees.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDatabase();
  }
});

// Initialize database table
function initDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      role TEXT NOT NULL,
      hireDate TEXT NOT NULL
    )
  `;
  
  db.run(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Employees table ready.');
    }
  });
}

// Helper function for validation
function validateEmployee(employee) {
  const { name, email, department, role, hireDate } = employee;
  
  if (!name || !email || !department || !role || !hireDate) {
    return { valid: false, message: 'All fields are required' };
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Invalid email format' };
  }
  
  // Date validation
  const date = new Date(hireDate);
  if (isNaN(date.getTime())) {
    return { valid: false, message: 'Invalid hire date format' };
  }
  
  return { valid: true };
}

// API Routes

// GET all employees
app.get('/api/employees', (req, res) => {
  const query = 'SELECT * FROM employees ORDER BY id DESC';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching employees:', err.message);
      return res.status(500).json({ error: 'Error fetching employees' });
    }
    res.json(rows);
  });
});

// GET single employee by ID
app.get('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM employees WHERE id = ?';
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching employee:', err.message);
      return res.status(500).json({ error: 'Error fetching employee' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(row);
  });
});

// GET employees by department
app.get('/api/employees/department/:dept', (req, res) => {
  const { dept } = req.params;
  const query = 'SELECT * FROM employees WHERE department = ? ORDER BY id DESC';
  
  db.all(query, [dept], (err, rows) => {
    if (err) {
      console.error('Error fetching employees by department:', err.message);
      return res.status(500).json({ error: 'Error fetching employees' });
    }
    res.json(rows);
  });
});

// POST create new employee
app.post('/api/employees', (req, res) => {
  const { name, email, department, role, hireDate } = req.body;
  
  // Validate input
  const validation = validateEmployee(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }
  
  const query = `
    INSERT INTO employees (name, email, department, role, hireDate)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.run(query, [name, email, department, role, hireDate], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      console.error('Error creating employee:', err.message);
      return res.status(500).json({ error: 'Error creating employee' });
    }
    
    res.status(201).json({
      id: this.lastID,
      name,
      email,
      department,
      role,
      hireDate
    });
  });
});

// PUT update employee
app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, department, role, hireDate } = req.body;
  
  // Validate input
  const validation = validateEmployee(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }
  
  const query = `
    UPDATE employees
    SET name = ?, email = ?, department = ?, role = ?, hireDate = ?
    WHERE id = ?
  `;
  
  db.run(query, [name, email, department, role, hireDate, id], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      console.error('Error updating employee:', err.message);
      return res.status(500).json({ error: 'Error updating employee' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({
      id: parseInt(id),
      name,
      email,
      department,
      role,
      hireDate
    });
  });
});

// DELETE employee
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM employees WHERE id = ?';
  
  db.run(query, [id], function(err) {
    if (err) {
      console.error('Error deleting employee:', err.message);
      return res.status(500).json({ error: 'Error deleting employee' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ message: 'Employee deleted successfully' });
  });
});

// Serve React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});
