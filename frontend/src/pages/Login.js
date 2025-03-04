import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Import styles

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed.");

      localStorage.setItem("token", data.token);

      if (data.user.role === "student") {
        navigate("/student_dashboard");
      } else if (data.user.role === "professor") {
        navigate("/professor_dashboard");
      }
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="container">
      <div className="login-box">
        <img src="/logo.png" alt="Dragon Insight Logo" className="logo" />
        <h1>Welcome</h1>
        <p>Log in to Dragon Insight to continue.</p>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <form onSubmit={handleLogin}>
          <label htmlFor="email">Email address*</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password*</label>
          <div className="password-container">
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="password-toggle" onClick={() => {
              document.getElementById("password").type =
                document.getElementById("password").type === "password" ? "text" : "password";
            }}>
              👁
            </span>
          </div>

          <button type="submit" disabled={!email || password.length < 6}>
            Continue
          </button>
        </form>

        <p className="signup-text">
          Don't have an account? <a href="/signup">Sign up</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
