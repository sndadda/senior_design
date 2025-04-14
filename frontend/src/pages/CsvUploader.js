import React, { useState } from "react";
import axios from "axios";

// common upload componnet
const CsvUploader = ({ apiEndpoint, label }) => {
    const [file, setFile] = useState(null);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return alert("Please select a CSV file");

        const formData = new FormData();
        formData.append("csv", file);

        try {
            const res = await axios.post(`${process.env.REACT_APP_API_URL}${apiEndpoint}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                withCredentials: true,
            });
            alert("Upload successful!");
        } catch (err) {
            console.error("Upload error:", err);
            alert("Upload failed!");
        }
    };

    return (
        <form onSubmit={handleUpload} style={{ marginBottom: "20px" }}>
            <label><strong>{label}</strong></label><br />
            <input
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