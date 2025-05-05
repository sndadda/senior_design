import React, { useState, useRef } from "react";
import axios from "axios";
import "./CsvUploader.css";

// common upload component
const CsvUploader = ({ apiEndpoint, label }) => {
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null); // ref to reset file input

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return alert("Please select a CSV file");

        const formData = new FormData();
        formData.append("csv", file);

        try {
            const res = await axios.post(
                `${process.env.REACT_APP_API_URL}${apiEndpoint}`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                    withCredentials: true,
                }
            );

            const { successCount, failedCount, failedData } = res.data;

            let message = `✅ Upload Result:\n`;
            message += `Successful: ${successCount}\n`;
            message += `Failed: ${failedCount}\n`;

            if (failedData.length > 0) {
                message += `Failed Data:\n`;
                failedData.forEach((item, index) => {
                    const itemDetails = Object.entries(item)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(", ");
                    message += `${index + 1}. ${itemDetails}\n`;
                });
            }

            alert(message);
        } catch (err) {
            console.error("Upload error:", err);
            alert("❌ Upload failed! Please try again.");
        } finally {
            // 
            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = null;
            }
        }
    };

    return (
        <form onSubmit={handleUpload} style={{ marginBottom: "20px" }}>
            <label><strong>{label}</strong></label><br />
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files[0])}
            />
            <button type="submit">Confirm Upload</button>
        </form>
    );
};

const CsvUploadPage = () => {
    return (
        <div>
            <h2>CSV Uploaders</h2>

            <CsvUploader 
                apiEndpoint="/api/upload/survey_forms"
                label="Upload SurveyForms CSV"
            />
            <CsvUploader 
                apiEndpoint="/api/upload/upload_teams"
                label="Upload Teams(Groups) CSV"
            />
            <CsvUploader 
                apiEndpoint="/api/upload/upload_students"
                label="Upload Students CSV"
            />
            <CsvUploader 
                apiEndpoint="/api/upload/upload_team_members"
                label="Upload Team Members CSV"
            />
        </div>
    );
};

export default CsvUploadPage;