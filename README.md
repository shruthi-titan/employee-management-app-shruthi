# Employee Management System

An enterprise employee management system with CRUD operations built with Node.js, Express, SQLite, and React.

## Features

- ✅ **CRUD Operations**: Create, Read, Update, and Delete employee records
- ✅ **Employee Fields**: ID, Name, Email, Department, Role, Hire Date
- ✅ **Search & Filter**: Search employees by department
- ✅ **RESTful API**: Clean API design with proper error handling
- ✅ **Modern UI**: Responsive React frontend with intuitive interface
- ✅ **Data Validation**: Email validation and required field checks
- ✅ **SQLite Database**: Lightweight and efficient data storage

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **SQLite3** - Database
- **CORS** - Cross-origin resource sharing

### Frontend
- **React** - UI library
- **Hooks** - Modern state management
- **CSS3** - Styling with gradients and animations

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/shruthi-titan/employee-management-app-shruthi.git
   cd employee-management-app-shruthi
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

## Running the Application

### Development Mode

1. **Start the backend server**
   ```bash
   npm start
   ```
   The backend will run on `http://localhost:5000`

2. **Start the React frontend** (in a new terminal)
   ```bash
   cd client
   npm start
   ```
   The frontend will run on `http://localhost:3000`

### Production Mode

1. **Build the React app**
   ```bash
   cd client
   npm run build
   cd ..
   ```

2. **Start the server**
   ```bash
   npm start
   ```
   Access the app at `http://localhost:5000`

## API Endpoints

### Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/employees` | Get all employees |
| GET | `/employees/:id` | Get employee by ID |
| GET | `/employees/department/:dept` | Get employees by department |
| POST | `/employees` | Create new employee |
| PUT | `/employees/:id` | Update employee |
| DELETE | `/employees/:id` | Delete employee |

### Request/Response Examples

**Create Employee (POST /api/employees)**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "department": "Engineering",
  "role": "Software Engineer",
  "hireDate": "2024-01-15"
}
```

**Response**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "department": "Engineering",
  "role": "Software Engineer",
  "hireDate": "2024-01-15"
}
```

## Database Schema

### Employees Table
```sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  role TEXT NOT NULL,
  hireDate TEXT NOT NULL
);
```

## Features in Detail

### CRUD Operations
- **Create**: Add new employees through the form interface
- **Read**: View all employees in a table with pagination support
- **Update**: Edit existing employee details
- **Delete**: Remove employees with confirmation

### Search & Filter
- Real-time search by department name
- Case-insensitive filtering
- Displays filtered employee count

### Error Handling
- Form validation for all required fields
- Email format validation
- Duplicate email detection
- User-friendly error messages
- HTTP error status codes

### UI/UX Features
- Responsive design for all screen sizes
- Gradient header and buttons
- Hover effects on interactive elements
- Success/error notifications
- Confirmation dialogs for delete operations

## Project Structure

```
employee-management-app-shruthi/
├── server.js              # Express server and API routes
├── package.json           # Backend dependencies
├── employees.db           # SQLite database (created on first run)
├── .gitignore            # Git ignore file
├── README.md             # This file
└── client/               # React frontend
    ├── public/           # Static files
    ├── src/
    │   ├── App.js        # Main React component
    │   ├── App.css       # Styles
    │   └── index.js      # React entry point
    └── package.json      # Frontend dependencies
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Author

Shruthi Titan

## Acknowledgments

- Express.js documentation
- React documentation
- SQLite documentation

