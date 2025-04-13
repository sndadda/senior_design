import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const VerifyEmail = () => {
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingProfessor, setVerifyingProfessor] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const role = location.state?.role; 

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Invalid or expired code.");

      if (role === "professor") {
        setVerifyingProfessor(true);
      }

      navigate("/create-account", { state: { email, role } });
    } catch (error) {
      setErrorMessage(error.message);
      setVerifyingProfessor(false);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h1>Verify Your Email</h1>
      <p>Enter the 6-digit code sent to <strong>{email}</strong>.</p>

      {verifyingProfessor && (
        <p style={{ color: "blue", fontWeight: "bold" }}>
          Verifying professor email... Please wait.
        </p>
      )}

      {errorMessage && (
        <p style={{ color: "red", fontWeight: "bold" }}>{errorMessage}</p>
      )}

      {!verifyingProfessor && (
        <form onSubmit={handleVerifyCode} style={{ marginBottom: "20px" }}>
          <input 
            type="text" 
            value={code} 
            onChange={(e) => setCode(e.target.value)} 
            required 
            style={{ padding: "8px", marginRight: "10px", fontSize: "16px" }} 
          />
          <button 
            type="submit" 
            style={{
              padding: "10px 15px", 
              fontSize: "16px", 
              backgroundColor: "#007BFF", 
              color: "white", 
              border: "none", 
              cursor: "pointer"
            }}
          >
            Verify
          </button>
        </form>
      )}

      {/* Back to Sign Up button - always visible */}
      <button 
        onClick={() => navigate("/signup")}
        style={{
          padding: "10px 15px",
          fontSize: "16px",
          backgroundColor: "#DC3545",
          color: "white",
          border: "none",
          cursor: "pointer",
          display: "block",
          margin: "20px auto"
        }}
      >
        ← Back to Sign Up
      </button>
    </div>
  );
};

export default VerifyEmail;
