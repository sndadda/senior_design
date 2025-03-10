import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const VerifyEmail = () => {
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Invalid or expired code.");

      // Redirect to account creation after verifying
      navigate("/create-account", { state: { email } });
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div>
      <h1>Verify Your Email</h1>
      <p>Enter the 6-digit code sent to {email}.</p>

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

      <form onSubmit={handleVerifyCode}>
        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required />
        <button type="submit">Verify</button>
      </form>
    </div>
  );
};

export default VerifyEmail;
