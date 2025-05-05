import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css"; 

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false); // State to manage dropdown visibility

  if (!user) return null; 

  return (
    <nav className="dashboard-nav">
      <img src="/logo.png" alt="Logo" className="logo" />
      
      <div className="nav-links">
        {user.role === "student" ? (
          <>
            <button onClick={() => navigate("/student_dashboard")}>Home</button>
            <button onClick={() => navigate("/student_evaluation")}>Survey</button>
          </>
        ) : (
          <>
            <button onClick={() => navigate("/professor_dashboard")}>Home</button>
            <button onClick={() => navigate("/CsvUploader")}>CSV Import</button>
          </>
        )}
      </div>

      <div className="user-info">
        <span 
          className="user-name" 
          onClick={() => setDropdownOpen(!dropdownOpen)} 
        >
          {user.first_name} {user.last_name} ▼
        </span>
        
        {dropdownOpen && (
          <div className="dropdown-menu">
            <button className="logout-btn" onClick={onLogout}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
