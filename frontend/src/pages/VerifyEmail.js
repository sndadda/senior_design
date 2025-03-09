import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();
    const [message, setMessage] = useState("Verifying...");

    useEffect(() => {
        if (!token) {
            setMessage("Invalid verification link.");
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/verify-email?token=${token}`);
                const data = await response.json();

                if (!response.ok) throw new Error(data.message);

                setMessage("Email verified successfully! Redirecting to login...");
                setTimeout(() => navigate("/"), 3000);
            } catch (error) {
                setMessage(error.message);
            }
        };

        verifyEmail();
    }, [token, navigate]);

    return (
        <div>
            <h2>Email Verification</h2>
            <p>{message}</p>
        </div>
    );
};

export default VerifyEmail;
