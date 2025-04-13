import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Signup.css";

const Signup = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [aliasEmail, setAliasEmail] = useState(""); // Only for professors
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student"); // Default role
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  // Validate @drexel.edu email
  const isValidDrexelEmail = (email) => /^[a-zA-Z0-9._%+-]+@drexel\.edu$/.test(email);

  // Extract username from email
  const getUsername = (email) => email.split("@")[0];

  // Handle Signup & Send Verification Code
  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!isValidDrexelEmail(email)) {
      setErrorMessage("Email must be a valid @drexel.edu address.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (role === "professor" && !isValidDrexelEmail(aliasEmail)) {
      setErrorMessage("Alias email must be a valid Drexel email.");
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          username: getUsername(email),
          email,
          password,
          role,
          alias_email: role === "professor" ? aliasEmail : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to send verification code.");

      navigate("/verify-email", { state: { email, role, aliasEmail } });
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="container">
      <div className="login-box">
        <img src="/logo.png" alt="Dragon Insight Logo" className="logo" />
        <h1>Sign Up</h1>
        <p>Create your account to continue</p>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <form onSubmit={handleSignup}>
          <label htmlFor="first-name">First Name</label>
          <input type="text" id="first-name" placeholder="Enter your first name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />

          <label htmlFor="last-name">Last Name</label>
          <input type="text" id="last-name" placeholder="Enter your last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />

          <label htmlFor="signup-email">Email address</label>
          <input type="email" id="signup-email" placeholder="Enter your @drexel.edu email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label htmlFor="signup-password">Password</label>
          <input type="password" id="signup-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {role === "professor" && (
            <>
              <label htmlFor="alias-email">Professor Alias Email</label>
              <input type="email" id="alias-email" placeholder="e.g. sandrad@drexel.edu" value={aliasEmail} onChange={(e) => setAliasEmail(e.target.value)} required />
            </>
          )}

          <button type="submit">Sign Up</button>
        </form>

        <button onClick={() => navigate("/")} className="back-button">← Back to Login</button>

        <p className="signup-text">
          {role === "student" ? (
            <a href="#" onClick={() => setRole("professor")}>Are you a professor? Click here.</a>
          ) : (
            <a href="#" onClick={() => setRole("student")}>Signing up as professor? Click to switch back.</a>
          )}
        </p>
      </div>
    </div>
  );
};

export default Signup;
