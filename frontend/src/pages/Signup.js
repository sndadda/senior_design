import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Signup.css"; 

const Signup = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student"); // default to student
  const [aliasEmail, setAliasEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  // check if email is valid and @drexel.edu
  const isValidDrexelEmail = (email) => /^[a-zA-Z0-9._%+-]+@drexel\.edu$/.test(email);

  const getUsername = (email) => email.split("@")[0];

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!isValidDrexelEmail(email) || password.length < 8) {
      setErrorMessage("Invalid email or password.");
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
          email,
          password,
          role,
          alias_email: role === "professor" ? aliasEmail : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Sign-up failed.");

      alert("Sign-up successful! Redirecting...");
      navigate(role === "professor" ? "/professor_dashboard" : "/student_dashboard");
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

        <button onClick={() => navigate("/")} className="back-button">
          ← Back to Login
        </button>

        <p className="signup-text">
          {role === "student" ? (
            <a href="#" onClick={() => setRole("professor")}>
              Are you a professor? Click here.
            </a>
          ) : (
            <a href="#" onClick={() => setRole("student")}>
              Signing up as professor. Click to switch back to student.
            </a>
          )}
        </p>
      </div>
    </div>
  );
};
export default Signup;
