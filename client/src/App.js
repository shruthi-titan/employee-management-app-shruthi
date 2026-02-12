import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    role: '',
    hireDate: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [searchDepartment, setSearchDepartment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all employees
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Filter employees when search changes
  useEffect(() => {
    if (searchDepartment) {
      const filtered = employees.filter(emp => 
        emp.department.toLowerCase().includes(searchDepartment.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [searchDepartment, employees]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (err) {
      setError('Failed to fetch employees');
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const url = editingId ? `/api/employees/${editingId}` : '/api/employees';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      setSuccess(editingId ? 'Employee updated successfully' : 'Employee added successfully');
      setFormData({
        name: '',
        email: '',
        department: '',
        role: '',
        hireDate: ''
      });
      setEditingId(null);
      fetchEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (employee) => {
    setFormData({
      name: employee.name,
      email: employee.email,
      department: employee.department,
      role: employee.role,
      hireDate: employee.hireDate
    });
    setEditingId(employee.id);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      setSuccess('Employee deleted successfully');
      fetchEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      name: '',
      email: '',
      department: '',
      role: '',
      hireDate: ''
    });
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Employee Management System</h1>
      </header>

      <div className="container">
        {/* Employee Form */}
        <div className="form-container">
          <h2>{editingId ? 'Edit Employee' : 'Add New Employee'}</h2>
          {error && <div className="message error">{error}</div>}
          {success && <div className="message success">{success}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name:</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="department">Department:</label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Role:</label>
              <input
                type="text"
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="hireDate">Hire Date:</label>
              <input
                type="date"
                id="hireDate"
                name="hireDate"
                value={formData.hireDate}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update Employee' : 'Add Employee'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Employee List */}
        <div className="list-container">
          <h2>Employee List</h2>
          
          {/* Search by Department */}
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by department..."
              value={searchDepartment}
              onChange={(e) => setSearchDepartment(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="employee-count">
            Total Employees: {filteredEmployees.length}
          </div>

          {filteredEmployees.length === 0 ? (
            <p className="no-employees">No employees found.</p>
          ) : (
            <div className="employee-table-container">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Hire Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td>{employee.id}</td>
                      <td>{employee.name}</td>
                      <td>{employee.email}</td>
                      <td>{employee.department}</td>
                      <td>{employee.role}</td>
                      <td>{new Date(employee.hireDate).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-edit"
                          onClick={() => handleEdit(employee)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-delete"
                          onClick={() => handleDelete(employee.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
